const listenScopes = {
  everywhere: 'ambient,direct_message,direct_mention,mention',
}

module.exports = scope => {
  if (!listenScopes[scope]) {
    console.warn('unknown listen scope', scope);
    return;
  }

  return listenScopes[scope];
};