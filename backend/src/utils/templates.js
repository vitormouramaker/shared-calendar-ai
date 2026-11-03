const utils = {
  ok: (data, message = 'OK') => ({
    success: true,
    data,
    message,
  }),

  fail: (message = 'Tente novamente mais tarde.') => ({
    success: false,
    data: null,
    message,
  }),

  errorHandle: (error, route) => {
    console.error(`Erro na rota ${route}:`, {
      message: error.message || String(error),
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack,
    });
    return utils.fail('Tente novamente mais tarde.');
  },
};

module.exports = utils;
