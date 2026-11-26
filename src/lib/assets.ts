/** Đường dẫn tới file trong public/, đúng cả khi triển khai ở thư mục con (vd. GitHub Pages /ten-repo/). */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
