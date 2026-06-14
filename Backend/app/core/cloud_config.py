import cloudinary
from app.core.config import CLOUDINARY_URL
cloudinary.config(
    cloud_url=CLOUDINARY_URL,
    secure=True
)