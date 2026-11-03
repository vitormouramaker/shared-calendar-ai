const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const MAX_MESSAGES_PER_REQUEST = 100;

function isExpoPushToken(token) {
  return typeof token === "string" && /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(token);
}

function chunk(array, chunkSize) {
  const chunks = [];

  for (let index = 0; index < array.length; index += chunkSize) {
    chunks.push(array.slice(index, index + chunkSize));
  }

  return chunks;
}

async function sendPushNotifications(tokens, payload) {
  const validTokens = (tokens ?? []).filter(isExpoPushToken);

  if (validTokens.length === 0) {
    return {
      sentCount: 0,
      invalidTokens: [],
    };
  }

  const messages = validTokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  const invalidTokens = [];
  let sentCount = 0;

  for (const messageChunk of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageChunk),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Expo push error ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const data = Array.isArray(result?.data) ? result.data : [];

    data.forEach((item, index) => {
      if (item?.status === "ok") {
        sentCount += 1;
        return;
      }

      if (item?.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(messageChunk[index]?.to);
      }
    });
  }

  return {
    sentCount,
    invalidTokens,
  };
}

module.exports = {
  isExpoPushToken,
  sendPushNotifications,
};
