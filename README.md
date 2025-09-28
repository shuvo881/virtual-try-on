# Virtual Try-On AR System

A real-time AR virtual try-on application that allows users to try on glasses, hats, and other accessories using their webcam. Built with Django, MediaPipe for face detection, and Three.js for 3D rendering.

## 🎯 Features

- **Real-time Face Detection**: Advanced face tracking using MediaPipe with high accuracy
- **3D Model Support**: Supports .glb and .gltf 3D model formats
- **Multiple Accessories**: Try on glasses, hats, and other accessories
- **Real-time Positioning**: Accurate placement of accessories based on facial landmarks
- **Interactive Controls**: Adjust scale, position, and rotation of accessories
- **Model Upload**: Upload custom 3D models through the web interface
- **Photo Capture**: Take photos with virtual accessories applied
- **Responsive Design**: Works on desktop and mobile browsers

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- uv (Python package manager)
- Modern web browser with WebGL support
- Webcam access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd virtual-try-on
   ```

2. **Install dependencies using uv**
   ```bash
   uv sync
   ```

3. **Run database migrations**
   ```bash
   uv run python manage.py migrate
   ```

4. **Populate sample data (optional)**
   ```bash
   uv run python manage.py populate_sample_data
   ```

5. **Start the development server**
   ```bash
   uv run python manage.py runserver
   ```

6. **Open your browser**
   Navigate to `http://localhost:8000` and click "Start Trying On!"

## 🎮 How to Use

1. **Access the Try-On Interface**: Click "Try On" in the navigation or go to `/tryron/`

2. **Start Camera**: Click the "📹 Start Camera" button to enable webcam access

3. **Select Accessories**:
   - Choose between "Glasses" and "Hats" tabs
   - Click on any model to try it on

4. **Take Photos**: Click "📸 Take Photo" to capture and download your virtual try-on

5. **Upload Custom Models**: Use the upload section to add your own .glb/.gltf files

## 🏗️ Architecture

### Backend (Django)

- **Face Detection App**: Handles real-time face detection using MediaPipe
- **Models Manager App**: Manages 3D accessory models and categories
- **REST API**: Provides endpoints for face detection and model management

### Frontend (JavaScript)

- **Three.js**: 3D rendering and model loading
- **MediaPipe Integration**: Real-time face landmark detection
- **WebGL**: Hardware-accelerated 3D graphics
- **Responsive UI**: Modern CSS with backdrop filters and animations

### Key Components

1. **Face Tracker** (`face-tracker.js`): Handles webcam capture and face detection
2. **Model Loader** (`model-loader.js`): Loads and manages 3D models
3. **Try-On App** (`tryron-app.js`): Main application logic and UI coordination
4. **Simple Models** (`simple-models.js`): Generates basic geometric models for testing

## 📁 Project Structure

```
virtual-try-on/
├── face_detection/          # Face detection Django app
│   ├── models.py           # Database models for sessions and results
│   ├── views.py            # API endpoints for face detection
│   └── utils.py            # MediaPipe face tracking utilities
├── models_manager/         # 3D models management Django app
│   ├── models.py           # Database models for accessories
│   ├── views.py            # API endpoints for model management
│   └── serializers.py      # REST API serializers
├── static/                 # Static files (CSS, JavaScript)
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript modules
├── templates/             # HTML templates
├── media/                 # Uploaded files (created at runtime)
└── manage.py              # Django management script
```

## 🔧 API Endpoints

### Face Detection
- `POST /api/face/detect/` - Detect face landmarks in uploaded image
- `GET /api/face/history/` - Get detection history for current session
- `POST /api/face/clear-session/` - Clear current detection session

### Model Management
- `GET /api/models/list/` - List all available models by category
- `POST /api/models/models/` - Upload new 3D model
- `GET /api/models/categories/` - List accessory categories

## 🎨 Supported 3D Formats

- **.glb** (Binary glTF) - Recommended for better performance
- **.gltf** (Text glTF) - Supported with external assets

### Model Requirements

- **File Size**: Maximum 10MB per model
- **Geometry**: Optimized for real-time rendering
- **Materials**: PBR materials recommended
- **Positioning**: Models should be centered at origin

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=virtual_try_on
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
```

### Face Detection Settings

In `settings.py`:

```python
FACE_DETECTION_CONFIDENCE = 0.7  # Detection confidence threshold
FACE_TRACKING_CONFIDENCE = 0.5   # Tracking confidence threshold
MAX_FACE_DETECTIONS = 1          # Maximum faces to detect
```

## 🧪 Testing

### Manual Testing

1. **Face Detection**: Test with different lighting conditions and face angles
2. **Model Loading**: Try uploading different .glb/.gltf files
3. **Real-time Performance**: Check frame rate and responsiveness
4. **Browser Compatibility**: Test on Chrome, Firefox, Safari, Edge

### Automated Testing

```bash
# Run Django tests
uv run python manage.py test

# Check code quality
uv run python manage.py check
```

## 🚀 Deployment

### Production Setup

1. **Set DEBUG=False** in settings
2. **Configure PostgreSQL** database
3. **Set up Redis** for caching
4. **Configure static files** serving
5. **Set up HTTPS** for webcam access

### Docker Deployment

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install uv && uv sync
CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **MediaPipe** - Google's framework for building perception pipelines
- **Three.js** - JavaScript 3D library
- **Django** - Python web framework
- **glTF** - 3D asset format specification

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**: Ensure HTTPS or localhost, check browser permissions
2. **Models not loading**: Verify file format and size limits
3. **Poor face detection**: Check lighting and camera quality
4. **Performance issues**: Reduce model complexity or lower detection frequency

### Browser Requirements

- **WebGL 2.0** support
- **getUserMedia** API support
- **Modern JavaScript** (ES6+)
- **WebAssembly** support (for MediaPipe)

For more help, please open an issue on the repository.
