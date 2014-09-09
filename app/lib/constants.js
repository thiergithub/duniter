
var META_TS = /^META:TS:[1-9][0-9]*$/;

module.exports = {

  ERROR: {

    PUBKEY: {
      ALREADY_UPDATED: 1
    }
  },

  UDID2_FORMAT: /\(udid2;c;([A-Z-]*);([A-Z-]*);(\d{4}-\d{2}-\d{2});(e\+\d{2}\.\d{2}(\+|-)\d{3}\.\d{2});(\d+)(;?)\)/,
  BASE58: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
  PUBLIC_KEY: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/,
  SIG: /^[A-Za-z0-9-_=]{87}$/,
  CERT: {
    SELF: {
      UID: /^UID:udid2;c;([A-Z-]*);([A-Z-]*);(\d{4}-\d{2}-\d{2});(e\+\d{2}\.\d{2}(\+|-)\d{3}\.\d{2});(\d+)(;?)$/,
      META: META_TS
    },
    OTHER: {
      META: META_TS,
      INLINE: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}:[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}:[1-9][0-9]*:[A-Za-z0-9-_=]{87}$/
    }
  }
};
