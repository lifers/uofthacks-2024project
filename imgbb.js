async function sendToImgbb(event) {
  const selectedFile = event.target.files[0];
  let ibb_url = 'k';

  if (selectedFile) {
      const formData = new FormData();
      formData.append('expiration', 300);
      formData.append('key', '60cfabd40a0dc9accdb250458d9f27e6');
      formData.append('image', selectedFile);

      const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
      })
      const data = await response.json();
      return data.data.image.url;
  }
};

module.exports = { sendToImgbb };