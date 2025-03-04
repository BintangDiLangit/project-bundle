export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export const sleepUntil = async (
  callback: () => Promise<boolean> | boolean,
  interval: number = 100
) => {
  return new Promise<void>((resolve) => {
    const id = setInterval(async () => {
      if (await callback()) {
        clearInterval(id);
        resolve();
      }
    }, interval);
  });
};
