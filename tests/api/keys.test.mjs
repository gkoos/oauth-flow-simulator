import request from "supertest";
import app from "../../lib/index.js";
import { signingKeys } from "../../lib/store.js";

describe("/sim/keys API", () => {
  let server;
  beforeAll((done) => {
    server = app.listen(4100, done);
  });
  afterAll((done) => {
    server.close(done);
  });

  it("GET /sim/keys returns the key from store", async () => {
    const res = await request(server).get("/sim/keys");
    expect(res.status).toBe(200);
    expect(res.body.keys.length).toBeGreaterThan(0);
    expect(res.body.keys[0].kid).toBe(signingKeys.keys[0].kid);
    expect(res.body.activeKid).toBe(signingKeys.activeKid);
  });

  it("POST /sim/keys/generate creates keys with different payloads", async () => {
    // RSA default
    let res = await request(server)
      .post("/sim/keys/generate")
      .send({ kty: "RSA", alg: "RS256" });
    expect(res.status).toBe(201);
    expect(res.body.kty).toBe("RSA");
    expect(res.body.alg).toBe("RS256");
    expect(res.body.n).toBeDefined();
    // EC key
    res = await request(server)
      .post("/sim/keys/generate")
      .send({ kty: "EC", alg: "ES256", curve: "P-256" });
    expect(res.status).toBe(201);
    expect(res.body.kty).toBe("EC");
    expect(res.body.alg).toBe("ES256");
    expect(res.body.crv).toBe("P-256");
    // With custom kid
    res = await request(server)
      .post("/sim/keys/generate")
      .send({ kty: "RSA", alg: "RS256", kid: "customKid123" });
    expect(res.status).toBe(201);
    expect(res.body.kid).toBe("customKid123");
  });

  it("POST /sim/keys then GET /sim/keys/:kid returns the key", async () => {
    const key = {
      kid: "importedKey1",
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: "nval",
      e: "eval",
      private: "priv",
      public: "pub"
    };
    let res = await request(server).post("/sim/keys").send(key);
    expect(res.status).toBe(201);
    expect(res.body.kid).toBe(key.kid);
    res = await request(server).get(`/sim/keys/${key.kid}`);
    expect(res.status).toBe(200);
    expect(res.body.kid).toBe(key.kid);
    expect(res.body.kty).toBe("RSA");
  });

  it("DELETE /sim/keys/:kid for nonexisting key returns error", async () => {
    const res = await request(server).delete("/sim/keys/nonexistentKey");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("DELETE /sim/keys/:kid for existing key then GET /sim/keys returns empty", async () => {
    // Delete the hardcoded key
    const kid = signingKeys.keys[0].kid;
    let res = await request(server).delete(`/sim/keys/${kid}`);
    expect(res.status).toBe(204);
    res = await request(server).get("/sim/keys");
    // Should not contain the deleted key
    expect(res.body.keys.find((k) => k.kid === kid)).toBeUndefined();
  });

  it("POST /sim/keys with duplicate kid returns error", async () => {
    const key = {
      kid: "dupeKey",
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: "nval",
      e: "eval",
      private: "priv",
      public: "pub"
    };
    let res = await request(server).post("/sim/keys").send(key);
    expect(res.status).toBe(201);
    res = await request(server).post("/sim/keys").send(key);
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });
});
