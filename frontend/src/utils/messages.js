export const mergeMessages = (...groups) => {
  const merged = [];
  const positions = new Map();

  for (const messages of groups) {
    for (const message of messages || []) {
      const key = message?._id;
      if (!key || !positions.has(key)) {
        if (key) positions.set(key, merged.length);
        merged.push(message);
      } else {
        merged[positions.get(key)] = message;
      }
    }
  }

  return merged;
};
