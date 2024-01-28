const { CohereClient } = require("cohere-ai");

const cohere = new CohereClient({
    token: "xps8bJBB81WIxyE5nwzXKC8DlYltL3tvhsfDY1a1",
});

async function makeStory(location, time) {
  const storyblock = document.getElementById('story');

  const generate = await cohere.generate({
      prompt: `2 fun facts about ${location} during the ${time}`,
      max_tokens: 80,
  });

  const textWithBreaks = generate.generations[0].text.replace(/\n/g, '<br />');
  const p = document.createElement('p');
  p.innerHTML = textWithBreaks;
  storyblock.appendChild(p);

  console.log(generate);
};

module.exports = { makeStory };