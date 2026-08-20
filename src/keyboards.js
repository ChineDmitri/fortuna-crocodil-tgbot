export function urlKeyboard(text, url) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text, url }]]
    }
  };
}

export function webAppKeyboard(text, url) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text, web_app: { url } }]]
    }
  };
}

export function callbackKeyboard(text, callbackData) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text, callback_data: callbackData }]]
    }
  };
}

