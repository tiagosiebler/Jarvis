// generate a pretty attachment based on a plain title and main body
module.exports = (title, body) => {
  return {
    attachments: [
      {
        fallback: title,
        title: title,
        text: body
      }
    ]
  };
};
