export const getImageUrl = (key: string) => {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    // Use relative path so it works through Vite proxy (localhost or ngrok)
    return `/r2/${key}`;
  }

  const r2BaseUrl = import.meta.env.VITE_R2_URL;
  if (!r2BaseUrl) {
    console.warn('VITE_R2_URL not set - R2 images may not load in production');
    return '';
  }

  return `${r2BaseUrl}/${key}`;
};