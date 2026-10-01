export const formatMySQLDate = (date) => {
  if (!date) {
    return null;
  }

  // If already YYYY-MM-DD
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return null;
  }

  // Convert to India local date
  //   const indiaDate = new Date(
  //     d.toLocaleString("en-US", {
  //       timeZone: "Asia/Kolkata",
  //     }),
  //   );
  //const year = d.getUTCFullYear();
  const year = d.getFullYear();

  //const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  //const day = String(d.getUTCDate()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
