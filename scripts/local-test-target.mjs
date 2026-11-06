export function assertLocalOrigin(value, hostname) {
  let url;
  try { url = new URL(value); } catch { throw new Error('A valid local test origin is required'); }
  if (url.protocol !== 'http:' || url.hostname !== hostname || !url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) throw new Error('Remote or ambiguous test target refused');
  return url.origin;
}
