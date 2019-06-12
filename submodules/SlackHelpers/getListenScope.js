const listenScopes = {
  everywhere: 'ambient,direct_message,direct_mention,mention,file_share'
};

module.exports = scope => {
  if (!listenScopes[scope]) {
    console.warn('unknown listen scope', scope);
    return;
  }

  return listenScopes[scope];
};
