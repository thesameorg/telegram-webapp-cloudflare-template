export const getImageUrl = (key: string) => {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    // Use relative path so it works through Vite proxy (localhost or ngrok)
    return `/r2/${key}`;
  }
  return `https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev/${key}`;
};