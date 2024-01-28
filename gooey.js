async function sendToGooey(event, ibb_url, location, time) {
  event.preventDefault();
  console.log(ibb_url);

  const payload = {
      "input_image": ibb_url,
      "text_prompt": `in ${location} in the ${time}`,
      "negative_prompt": "people",
  }

  const response = await fetch("https://api.gooey.ai/v2/ObjectInpainting/", {
      method: 'POST',
      headers: {
          "Authorization": `Bearer sk-Uoonkr50AneY17EACwYytduIBiV4zpn35C7UIjT9sodYv6zw`,
          "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
  })
  const data = await response.json();
  console.log(data);
  const transformedUrl = data.output.output_images[0];
  console.log(transformedUrl);

  const img = document.createElement('img');
  img.src = transformedUrl;

  const retro = document.getElementById('retro');
  retro.style.textAlign = 'center';
  retro.appendChild(img);
};

module.exports = { sendToGooey };