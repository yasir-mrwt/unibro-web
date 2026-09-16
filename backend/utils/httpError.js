const sendServerError = (res, message, error) => {
  if (process.env.NODE_ENV === "development") {
    console.error(`${message}: ${error.message}`);
  }

  return res.status(500).json({
    success: false,
    message,
  });
};

module.exports = { sendServerError };
