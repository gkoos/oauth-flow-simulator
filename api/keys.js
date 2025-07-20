import express from "express";
import { signingKeys } from "../lib/store.js";
import crypto from "crypto";

const router = express.Router();

// Helper to find key by kid
function findKey(kid) {
  return signingKeys.keys.find((k) => k.kid === kid);
}

// Helper to generate random kid
function generateKid() {
  return crypto.randomBytes(8).toString("hex");
}

// GET /sim/keys - list all keys
router.get("/sim/keys", (req, res) => {
  res.json(signingKeys.keys);
});

// POST /sim/keys - create new key (import)
router.post("/sim/keys", (req, res) => {
  const { kid } = req.body;
  if (kid && findKey(kid)) {
    return res.status(409).json({ error: "Key with this kid already exists" });
  }
  const newKey = { ...req.body };
  if (!newKey.kid) newKey.kid = generateKid();
  signingKeys.keys.push(newKey);
  res.status(201).json(newKey);
});

// GET /sim/keys/:kid - fetch key by kid
router.get("/sim/keys/:kid", (req, res) => {
  const key = findKey(req.params.kid);
  if (!key) return res.status(404).json({ error: "Key not found" });
  res.json(key);
});

// DELETE /sim/keys/:kid - delete key
router.delete("/sim/keys/:kid", (req, res) => {
  const idx = signingKeys.keys.findIndex((k) => k.kid === req.params.kid);
  if (idx === -1) return res.status(404).json({ error: "Key not found" });
  signingKeys.keys.splice(idx, 1);
  res.status(204).end();
});

// POST /sim/keys/active/:kid - set active key for signing
router.post("/sim/keys/active/:kid", (req, res) => {
  const key = findKey(req.params.kid);
  if (!key) return res.status(404).json({ error: "Key not found" });
  signingKeys.activeKid = key.kid;
  res.json(key);
});

// POST /sim/keys/generate - generate a new key
router.post("/sim/keys/generate", async (req, res) => {
  const { alg, kty, kid, keySize = 2048, curve = "P-256", use = "sig" } = req.body;
  let newKid = kid || generateKid();
  if (findKey(newKid)) {
    return res.status(409).json({ error: "Key with this kid already exists" });
  }
  let keyObj;
  try {
    if (kty === "RSA" || alg === "RS256") {
      // Generate RSA key
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: keySize,
      });
      const pubJwk = publicKey.export({ format: "jwk" });
      const privJwk = privateKey.export({ format: "jwk" });
      keyObj = {
        kid: newKid,
        kty: "RSA",
        alg: alg || "RS256",
        use,
        n: pubJwk.n,
        e: pubJwk.e,
        d: privJwk.d,
        p: privJwk.p,
        q: privJwk.q,
        dp: privJwk.dp,
        dq: privJwk.dq,
        qi: privJwk.qi,
        private: privateKey.export({ format: "pem", type: "pkcs8" }),
        public: publicKey.export({ format: "pem", type: "spki" }),
      };
    } else if (kty === "EC" || alg === "ES256") {
      // Generate EC key
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
        namedCurve: curve,
      });
      const pubJwk = publicKey.export({ format: "jwk" });
      const privJwk = privateKey.export({ format: "jwk" });
      keyObj = {
        kid: newKid,
        kty: "EC",
        alg: alg || "ES256",
        use,
        crv: pubJwk.crv,
        x: pubJwk.x,
        y: pubJwk.y,
        d: privJwk.d,
        private: privateKey.export({ format: "pem", type: "pkcs8" }),
        public: publicKey.export({ format: "pem", type: "spki" }),
      };
    } else {
      return res.status(400).json({ error: "Unsupported key type or algorithm" });
    }
    signingKeys.keys.push(keyObj);
    res.status(201).json(keyObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
