import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Dict, Any, Tuple
import logging
import time
from django.conf import settings

logger = logging.getLogger(__name__)

class AdvancedFaceTracker:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=getattr(settings, 'MAX_FACE_DETECTIONS', 1),
            refine_landmarks=True,
            min_detection_confidence=getattr(settings, 'FACE_DETECTION_CONFIDENCE', 0.7),
            min_tracking_confidence=getattr(settings, 'FACE_TRACKING_CONFIDENCE', 0.5)
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Face mesh landmark indices for key points
        self.LANDMARK_INDICES = {
            'left_eye_center': 33,
            'right_eye_center': 362,
            'left_eye_inner': 133,
            'right_eye_inner': 362,
            'left_eye_outer': 33,
            'right_eye_outer': 263,
            'nose_tip': 1,
            'nose_bridge': 6,
            'forehead_center': 10,
            'forehead_left': 21,
            'forehead_right': 251,
            'chin_center': 175,
            'left_cheek': 116,
            'right_cheek': 345,
            'left_ear_tip': 234,
            'right_ear_tip': 454,
            'mouth_left': 61,
            'mouth_right': 291,
            'mouth_top': 13,
            'mouth_bottom': 14
        }
    
    def detect_face_landmarks(self, image_data: bytes) -> Optional[Dict[str, Any]]:
        """
        Advanced face detection with comprehensive landmark extraction
        """
        start_time = time.time()
        
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image")
                return None
            
            # Get image dimensions
            height, width, channels = image.shape
            
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process the image
            results = self.face_mesh.process(rgb_image)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            if results.multi_face_landmarks and len(results.multi_face_landmarks) > 0:
                landmarks = results.multi_face_landmarks[0]
                return self._extract_comprehensive_landmarks(landmarks, width, height, processing_time)
            
            return None
            
        except Exception as e:
            logger.error(f"Error in face detection: {e}")
            return None
    
    def _extract_comprehensive_landmarks(self, landmarks, width: int, height: int, processing_time: float) -> Dict[str, Any]:
        """
        Extract comprehensive facial landmarks with measurements and calculations
        """
        def get_point_coords(idx: int) -> Dict[str, float]:
            point = landmarks.landmark[idx]
            return {
                'x': point.x * width,
                'y': point.y * height,
                'z': point.z * width,  # Normalized depth
                'visibility': getattr(point, 'visibility', 1.0)
            }
        
        # Extract key points
        key_points = {}
        for name, idx in self.LANDMARK_INDICES.items():
            key_points[name] = get_point_coords(idx)
        
        # Calculate face measurements
        measurements = self._calculate_face_measurements(key_points)
        
        # Calculate face orientation
        orientation = self._calculate_face_orientation(key_points)
        
        # Calculate accessory positions
        accessory_positions = self._calculate_accessory_positions(key_points, measurements)
        
        return {
            'landmarks': key_points,
            'measurements': measurements,
            'orientation': orientation,
            'accessory_positions': accessory_positions,
            'processing_time': processing_time,
            'confidence': self._calculate_confidence(key_points),
            'image_dimensions': {'width': width, 'height': height}
        }
    
    def _calculate_face_measurements(self, points: Dict) -> Dict[str, float]:
        """Calculate comprehensive face measurements"""
        left_eye = points['left_eye_center']
        right_eye = points['right_eye_center']
        forehead = points['forehead_center']
        chin = points['chin_center']
        
        # Eye distance
        eye_distance = np.sqrt(
            (right_eye['x'] - left_eye['x']) ** 2 + 
            (right_eye['y'] - left_eye['y']) ** 2
        )
        
        # Face height
        face_height = np.sqrt(
            (chin['x'] - forehead['x']) ** 2 + 
            (chin['y'] - forehead['y']) ** 2
        )
        
        # Face width (ear to ear approximation)
        face_width = eye_distance * 2.5  # Approximate multiplier
        
        # Eye center point
        eye_center = {
            'x': (left_eye['x'] + right_eye['x']) / 2,
            'y': (left_eye['y'] + right_eye['y']) / 2,
            'z': (left_eye['z'] + right_eye['z']) / 2
        }
        
        return {
            'eye_distance': eye_distance,
            'face_height': face_height,
            'face_width': face_width,
            'eye_center': eye_center,
            'aspect_ratio': face_width / face_height if face_height > 0 else 1.0
        }
    
    def _calculate_face_orientation(self, points: Dict) -> Dict[str, float]:
        """Calculate face orientation angles"""
        left_eye = points['left_eye_center']
        right_eye = points['right_eye_center']
        nose = points['nose_tip']
        
        # Roll angle (head tilt)
        roll = np.arctan2(
            right_eye['y'] - left_eye['y'],
            right_eye['x'] - left_eye['x']
        )
        
        # Yaw angle (head turn) - simplified estimation
        eye_center_x = (left_eye['x'] + right_eye['x']) / 2
        face_center_offset = nose['x'] - eye_center_x
        yaw = np.arctan(face_center_offset / 100) # Normalized estimation
        
        # Pitch angle (head nod) - simplified estimation
        eye_center_y = (left_eye['y'] + right_eye['y']) / 2
        nose_offset = nose['y'] - eye_center_y
        pitch = np.arctan(nose_offset / 100)
        
        return {
            'roll': float(roll),
            'yaw': float(yaw),
            'pitch': float(pitch),
            'roll_degrees': float(np.degrees(roll)),
            'yaw_degrees': float(np.degrees(yaw)),
            'pitch_degrees': float(np.degrees(pitch))
        }
    
    def _calculate_accessory_positions(self, points: Dict, measurements: Dict) -> Dict[str, Dict]:
        """Calculate optimal positions for different accessories"""
        eye_center = measurements['eye_center']
        forehead = points['forehead_center']
        
        return {
            'glasses': {
                'position': eye_center,
                'scale': measurements['eye_distance'] / 120,  # Base scale
                'rotation_point': eye_center,
                'width': measurements['eye_distance'] * 1.4,
                'height': measurements['eye_distance'] * 0.6
            },
            'hat': {
                'position': {
                    'x': forehead['x'],
                    'y': forehead['y'] - measurements['face_height'] * 0.2,
                    'z': forehead['z']
                },
                'scale': measurements['face_width'] / 200,
                'rotation_point': forehead,
                'width': measurements['face_width'],
                'height': measurements['face_width'] * 0.6
            },
            'earrings': {
                'left_position': points['left_ear_tip'],
                'right_position': points['right_ear_tip'],
                'scale': measurements['eye_distance'] / 150,
            }
        }
    
    def _calculate_confidence(self, points: Dict) -> float:
        """Calculate detection confidence based on landmark visibility"""
        total_visibility = sum(point.get('visibility', 1.0) for point in points.values())
        average_visibility = total_visibility / len(points)
        return min(average_visibility, 1.0)

# Global face tracker instance
face_tracker = AdvancedFaceTracker()