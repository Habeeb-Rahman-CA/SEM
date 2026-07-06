#!/usr/bin/env node
const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'lmekaycw',
  api_key: '417186344657729',
  api_secret: '7lvDAEc7d0R1tR1HbgEA_3DpCzE'
});

async function run() {
  try {
    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    
    console.log('Uploading sample image...');
    // 2. Upload an image
    const uploadResult = await cloudinary.uploader.upload(imageUrl);
    console.log('Upload Successful!');
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);

    // 3. Get image details
    console.log('\nFetching image details...');
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log('Image Metadata:');
    console.log('Width:', details.width, 'px');
    console.log('Height:', details.height, 'px');
    console.log('Format:', details.format);
    console.log('File Size:', details.bytes, 'bytes');

    // 4. Transform the image
    // f_auto: Automatic format selection (delivers WebP, AVIF, etc. depending on browser support)
    // q_auto: Automatic quality selection (compresses the image to optimize file size without human-perceived quality loss)
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      transformation: [
        { fetch_format: 'auto', quality: 'auto' }
      ]
    });

    console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);

  } catch (error) {
    console.error('Error occurred:', error.message || error);
  }
}

run();
