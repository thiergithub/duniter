var jpgp        = require('../lib/jpgp');
var async       = require('async');
var mongoose    = require('mongoose');
var PublicKey   = mongoose.model('PublicKey');
var Membership  = mongoose.model('Membership');
var Voting      = mongoose.model('Voting');
var Vote        = mongoose.model('Vote');
var Transaction = mongoose.model('Transaction');

module.exports.get = function (currencyName) {

  return ParameterNamespace(currencyName);
};

function ParameterNamespace (currency) {

  var that = this;

  this.getTransaction = function (req, callback) {
    async.waterfall([
      function (next){
        this.getTransactionFromRaw(req.body && req.body.transaction, req.body && req.body.signature, next);
      },
      function (pubkey, signedTx, next) {
        var tx = new Transaction({});
        async.waterfall([
          function (next){
            tx.parse(signedTx, next);
          },
          function (tx, next){
            tx.verify(currency, next);
          },
          function (verified, next){
            if(!verified){
              next('Bad document structure');
              return;
            }
            next();
          },
          function (next){
            tx.verifySignature(pubkey.raw, next);
          }
        ], function (err, verified) {
          next(err, tx);
        });
      }
    ], callback);
  };

  this.getTransactionFromRaw = function (transaction, signature, callback) {
    // Parameters
    if(!(transaction && signature)){
      callback('Requires a transaction + signature');
      return;
    }

    // Check signature's key ID
    var keyID = jpgp().signature(signature).issuer();
    if(!(keyID && keyID.length == 16)){
      callback('Cannot identify signature issuer`s keyID');
      return;
    }

    // Looking for corresponding public key
    PublicKey.getTheOne(keyID, function (err, pubkey) {
      callback(err, pubkey, transaction + signature);
    });
  };

  this.getPeeringEntry = function (req, callback) {
    this.getPeeringEntryFromRaw(req.body && req.body.entry, req.body && req.body.signature, callback);
  };

  this.getPeeringEntryFromRaw = function (entry, signature, callback) {
    // Parameters
    if(!(entry && signature)){
      callback('Requires a peering entry + signature');
      return;
    }

    // Check signature's key ID
    var keyID = jpgp().signature(signature).issuer();
    if(!(keyID && keyID.length == 16)){
      callback('Cannot identify signature issuer`s keyID');
      return;
    }
    callback(null, entry + signature, keyID);
  };

  this.getFingerprint = function (req, callback){
    if(!req.params.fpr){
      callback("Fingerprint is required");
      return;
    }
    var matches = req.params.fpr.match(/(\w{40})/);
    if(!matches){
      callback("Fingerprint format is incorrect, must be an upper-cased SHA1 hash");
      return;
    }
    callback(null, matches[1]);
  };

  this.getNumber = function (req, callback){
    if(!req.params.number){
      callback("Number is required");
      return;
    }
    var matches = req.params.number.match(/^(\d+)$/);
    if(!matches){
      callback("Number format is incorrect, must be a positive integer");
      return;
    }
    callback(null, matches[1]);
  };

  this.getCount = function (req, callback){
    if(!req.params.count){
      callback("Count is required");
      return;
    }
    var matches = req.params.count.match(/^(\d+)$/);
    if(!matches){
      callback("Count format is incorrect, must be a positive integer");
      return;
    }
    var count = parseInt(matches[1], 10);
    if(count <= 0){
      callback("Count must be a positive integer");
      return;
    }
    callback(null, matches[1]);
  };

  this.getTransactionID = function (req, callback) {
    async.series({
      fprint: async.apply(that.getFingerprint, req),
      number: async.apply(that.getNumber, req)
    },
    function(err, results) {
      callback(null, results.fprint, results.number);
    });
  };

  this.getVote = function (req, callback){
    if(!(req.body && req.body.amendment && req.body.signature)){
      callback('Requires an amendment + signature');
      return;
    }
    var vote = new Vote();
    async.waterfall([
      function (next){
        // Extract data
        vote.parse(req.body.amendment.unix2dos() + req.body.signature.unix2dos(), next);
      },
      function (vote, next){
        // Verify content and signature
        vote.verify(currency, next);
      },
    ], function (err, verified) {
      callback(err, vote);
    });
  };

  this.getAmendmentID = function (req, callback) {
    if(!req.params || !req.params.amendment_id){
      callback("Amendment ID is required");
      return;
    }
    var matches = req.params.amendment_id.match(/^(\d+)-(\w{40})$/);
    if(!matches){
      callback("Amendment ID format is incorrect, must be 'number-hash'");
      return;
    }
    callback(null, matches[1], matches[2]);
  };

  this.getAmendmentNumber = function (req, callback) {
    if(!req.params || !req.params.amendment_number){
      callback("Amendment number is required");
      return;
    }
    var matches = req.params.amendment_number.match(/^(\d+)$/);
    if(!matches){
      callback("Amendment number format is incorrect, must be an integer value");
      return;
    }
    callback(null, matches[1]);
  };

  this.getCoinID = function (req, callback) {
    if(!req.params || !req.params.coin_id){
      callback("Coin ID is required");
      return;
    }
    var matches = req.params.coin_id.match(/^(\w{40})-(\d+)-(\d+)$/);
    if(!matches){
      callback("Coin ID format is incorrect, must be 'hash-amNumber-coinNumber'");
      return;
    }
    callback(null, matches[1], matches[2], matches[3]);
  };

  this.getMembership = function (req, callback) {
    if(!(req.body && req.body.membership && req.body.signature)){
      callback('Requires a membership + signature');
      return;
    }
    async.waterfall([

      // Check signature's key ID
      function(callback){
        var sig = req.body.signature;
        var keyID = jpgp().signature(sig).issuer();
        if(!(keyID && keyID.length == 16)){
          callback('Cannot identify signature issuer`s keyID');
          return;
        }
        callback(null, keyID);
      },

      // Looking for corresponding public key
      function(keyID, callback){
        PublicKey.getTheOne(keyID, function (err, pubkey) {
          callback(err, pubkey);
        });
      },

      function (pubkey, next){
        var entry = new Membership();
        async.waterfall([
          function (next){
            entry.parse(req.body.membership + req.body.signature, next);
          },
          function (entry, next){
            entry.verify(currency, next);
          },
          function (valid, next){
            entry.verifySignature(pubkey.raw, next);
          },
          function (verified, next){
            if(!verified){
              next('Bad signature');
              return;
            }
            if(pubkey.fingerprint != entry.issuer){
              next('Fingerprint in Membership (' + entry.issuer + ') does not match signatory (' + pubkey.fingerprint + ')');
              return;
            }
            next(null, entry);
          },
        ], next);
      },
    ], callback);
  };

  this.getVoting = function (req, callback) {
    if(!(req.body && req.body.voting && req.body.signature)){
      callback('Requires a voting + signature');
      return;
    }
    async.waterfall([

      function (callback) {
        if(req.body.signature.indexOf('-----BEGIN') == -1){
          callback('Signature does not seem to be valid');
          return;
        }
        callback();
      },

      // Check signature's key ID
      function(callback){
        var sig = req.body.signature;
        var keyID = jpgp().signature(sig).issuer();
        if(!(keyID && keyID.length == 16)){
          callback('Cannot identify signature issuer`s keyID');
          return;
        }
        callback(null, keyID);
      },

      // Looking for corresponding public key
      function(keyID, callback){
        PublicKey.getTheOne(keyID, function (err, pubkey) {
          callback(err, pubkey);
        });
      },

      function (pubkey, next){
        var entry = new Voting();
        async.waterfall([
          function (next){
            entry.parse(req.body.voting + req.body.signature, next);
          },
          function (entry, next){
            entry.verify(currency, next);
          },
          function (valid, next){
            entry.verifySignature(pubkey.raw, next);
          },
          function (verified, next){
            if(!verified){
              next('Bad signature');
              return;
            }
            if(pubkey.fingerprint != entry.issuer){
              next('Fingerprint in Voting (' + entry.issuer + ') does not match signatory (' + pubkey.fingerprint + ')');
              return;
            }
            next(null, entry);
          },
        ], next);
      },
    ], callback);
  };

  this.getWallet = function (req, callback) {
    if(!(req.body && req.body.entry && req.body.signature)){
      callback('Requires a Wallet entry + signature');
      return;
    }
    callback(null, req.body.entry + req.body.signature);
  };

  this.getStatus = function (req, callback) {
    if(!(req.body && req.body.status && req.body.signature)){
      callback('Requires a status + signature');
      return;
    }
    callback(null, req.body.status + req.body.signature);
  };

  this.getPubkey = function (req, callback) {
    if(!req.body || !req.body.keytext){
      callback('Parameter `keytext` is required');
      return;
    }
    if(!req.body.keytext.match(/BEGIN PGP PUBLIC KEY/) || !req.body.keytext.match(/END PGP PUBLIC KEY/)){
      callback('Keytext does not look like a public key message');
      return;
    }
    var PublicKey = mongoose.model('PublicKey');
    var pubkey = new PublicKey({ raw: req.body.keytext });
    pubkey.construct(function (err) {
      callback(err, pubkey);
    });
  };

  return this;
};