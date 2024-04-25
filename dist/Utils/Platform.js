"use strict";

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
// Utis
const Auth = require('./Auth');
const Keyset = require('./Keyset');
const provPlatformDebug = require('debug')('provider:platform');

/**
 * @description Class representing a registered platform.
 */
var _platformName = /*#__PURE__*/new WeakMap();
var _platformUrl = /*#__PURE__*/new WeakMap();
var _clientId = /*#__PURE__*/new WeakMap();
var _authenticationEndpoint = /*#__PURE__*/new WeakMap();
var _authConfig2 = /*#__PURE__*/new WeakMap();
var _ENCRYPTIONKEY2 = /*#__PURE__*/new WeakMap();
var _accesstokenEndpoint = /*#__PURE__*/new WeakMap();
var _authorizationServer = /*#__PURE__*/new WeakMap();
var _kid = /*#__PURE__*/new WeakMap();
var _Database = /*#__PURE__*/new WeakMap();
class Platform {
  /**
     * @param {string} name - Platform name.
     * @param {string} platformUrl - Platform url.
     * @param {string} clientId - Client Id generated by the platform.
     * @param {string} authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {string} accesstokenEndpoint - Access token endpoint for the platform.
     * @param {string} authorizationServer - Authorization server identifier to be used as the aud when requesting an access token. If not specified, the access token endpoint URL will be used.
     * @param {string} kid - Key id for local keypair used to sign messages to this platform.
     * @param {string} _ENCRYPTIONKEY - Encryption key used
     * @param {Object} _authConfig - Authentication configurations for the platform.
     */
  constructor(name, platformUrl, clientId, authenticationEndpoint, accesstokenEndpoint, authorizationServer, kid, _ENCRYPTIONKEY, _authConfig, Database) {
    _classPrivateFieldInitSpec(this, _platformName, void 0);
    _classPrivateFieldInitSpec(this, _platformUrl, void 0);
    _classPrivateFieldInitSpec(this, _clientId, void 0);
    _classPrivateFieldInitSpec(this, _authenticationEndpoint, void 0);
    _classPrivateFieldInitSpec(this, _authConfig2, void 0);
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY2, void 0);
    _classPrivateFieldInitSpec(this, _accesstokenEndpoint, void 0);
    _classPrivateFieldInitSpec(this, _authorizationServer, void 0);
    _classPrivateFieldInitSpec(this, _kid, void 0);
    _classPrivateFieldInitSpec(this, _Database, void 0);
    _classPrivateFieldSet(_authConfig2, this, _authConfig);
    _classPrivateFieldSet(_ENCRYPTIONKEY2, this, _ENCRYPTIONKEY);
    _classPrivateFieldSet(_platformName, this, name);
    _classPrivateFieldSet(_platformUrl, this, platformUrl);
    _classPrivateFieldSet(_clientId, this, clientId);
    _classPrivateFieldSet(_authenticationEndpoint, this, authenticationEndpoint);
    _classPrivateFieldSet(_accesstokenEndpoint, this, accesstokenEndpoint);
    _classPrivateFieldSet(_authorizationServer, this, authorizationServer);
    _classPrivateFieldSet(_kid, this, kid);
    _classPrivateFieldSet(_Database, this, Database);
  }

  /**
   * @description Gets the platform url.
   */
  async platformUrl() {
    return _classPrivateFieldGet(_platformUrl, this);
  }

  /**
   * @description Gets the platform client id.
   */
  async platformClientId() {
    return _classPrivateFieldGet(_clientId, this);
  }

  /**
     * @description Sets/Gets the platform name.
     * @param {string} [name] - Platform name.
     */
  async platformName(name) {
    if (!name) return _classPrivateFieldGet(_platformName, this);
    await _classPrivateFieldGet(_Database, this).Modify(false, 'platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    }, {
      platformName: name
    });
    _classPrivateFieldSet(_platformName, this, name);
    return name;
  }

  /**
     * @description Gets the platform Id.
     */
  async platformId() {
    return _classPrivateFieldGet(_kid, this);
  }

  /**
   * @description Gets the platform key_id.
   */
  async platformKid() {
    return _classPrivateFieldGet(_kid, this);
  }

  /**
   * @description Sets/Gets the platform status.
   * @param {Boolean} [active] - Whether the Platform is active or not.
   */
  async platformActive(active) {
    if (active === undefined) {
      // Get platform status
      const platformStatus = await _classPrivateFieldGet(_Database, this).Get(false, 'platformStatus', {
        id: _classPrivateFieldGet(_kid, this)
      });
      if (!platformStatus || platformStatus[0].active) return true;else return false;
    }
    await _classPrivateFieldGet(_Database, this).Replace(false, 'platformStatus', {
      id: _classPrivateFieldGet(_kid, this)
    }, {
      id: _classPrivateFieldGet(_kid, this),
      active: active
    });
    return active;
  }

  /**
     * @description Gets the RSA public key assigned to the platform.
     *
     */
  async platformPublicKey() {
    const key = await _classPrivateFieldGet(_Database, this).Get(_classPrivateFieldGet(_ENCRYPTIONKEY2, this), 'publickey', {
      kid: _classPrivateFieldGet(_kid, this)
    });
    return key[0].key;
  }

  /**
     * @description Gets the RSA private key assigned to the platform.
     *
     */
  async platformPrivateKey() {
    const key = await _classPrivateFieldGet(_Database, this).Get(_classPrivateFieldGet(_ENCRYPTIONKEY2, this), 'privatekey', {
      kid: _classPrivateFieldGet(_kid, this)
    });
    return key[0].key;
  }

  /**
   * @description Return the platform public key as a JSON object. useful when doing manual registrations with LMSes
   */
  async platformJSONConfig() {
    var _keysets$keys;
    const keysets = await Keyset.build(_classPrivateFieldGet(_Database, this), _classPrivateFieldGet(_ENCRYPTIONKEY2, this));
    return keysets === null || keysets === void 0 || (_keysets$keys = keysets.keys) === null || _keysets$keys === void 0 ? void 0 : _keysets$keys.find(ks => ks.kid === _classPrivateFieldGet(_kid, this));
  }

  /**
     * @description Sets/Gets the platform authorization configurations used to validate it's messages.
     * @param {string} method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {string} key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
  async platformAuthConfig(method, key) {
    if (!method && !key) return _classPrivateFieldGet(_authConfig2, this);
    if (method && method !== 'RSA_KEY' && method !== 'JWK_KEY' && method !== 'JWK_SET') throw new Error('INVALID_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".');
    const authConfig = {
      method: method || _classPrivateFieldGet(_authConfig2, this).method,
      key: key || _classPrivateFieldGet(_authConfig2, this).key
    };
    await _classPrivateFieldGet(_Database, this).Modify(false, 'platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    }, {
      authConfig: authConfig
    });
    _classPrivateFieldSet(_authConfig2, this, authConfig);
    return authConfig;
  }

  /**
   * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint - Platform authentication endpoint.
   */
  async platformAuthenticationEndpoint(authenticationEndpoint) {
    if (!authenticationEndpoint) return _classPrivateFieldGet(_authenticationEndpoint, this);
    await _classPrivateFieldGet(_Database, this).Modify(false, 'platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    }, {
      authEndpoint: authenticationEndpoint
    });
    _classPrivateFieldSet(_authenticationEndpoint, this, authenticationEndpoint);
    return authenticationEndpoint;
  }

  /**
     * @description Sets/Gets the platform access token endpoint used to authenticate messages to the platform.
     * @param {string} [accesstokenEndpoint] - Platform access token endpoint.
     */
  async platformAccessTokenEndpoint(accesstokenEndpoint) {
    if (!accesstokenEndpoint) return _classPrivateFieldGet(_accesstokenEndpoint, this);
    await _classPrivateFieldGet(_Database, this).Modify(false, 'platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    }, {
      accesstokenEndpoint: accesstokenEndpoint
    });
    _classPrivateFieldSet(_accesstokenEndpoint, this, accesstokenEndpoint);
    return accesstokenEndpoint;
  }

  /**
   * @description Sets/Gets the platform authorization server identifier used as the aud claim when requesting access tokens.
   * @param {string} [authorizationServer] - authorization server identifier.
   */
  async platformAuthorizationServer(authorizationServer) {
    if (!authorizationServer) return _classPrivateFieldGet(_authorizationServer, this) || _classPrivateFieldGet(_accesstokenEndpoint, this);
    await _classPrivateFieldGet(_Database, this).Modify(false, 'platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    }, {
      authorizationServer: authorizationServer
    });
    _classPrivateFieldSet(_authorizationServer, this, authorizationServer);
    return authorizationServer;
  }

  /**
     * @description Gets the platform access token or attempts to generate a new one.
     * @param {String} scopes - String of scopes.
     */
  async platformAccessToken(scopes) {
    const result = await _classPrivateFieldGet(_Database, this).Get(_classPrivateFieldGet(_ENCRYPTIONKEY2, this), 'accesstoken', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this),
      scopes: scopes
    });
    let token;
    if (!result || (Date.now() - result[0].createdAt) / 1000 > result[0].token.expires_in) {
      provPlatformDebug('Valid access_token for ' + _classPrivateFieldGet(_platformUrl, this) + ' not found');
      provPlatformDebug('Attempting to generate new access_token for ' + _classPrivateFieldGet(_platformUrl, this));
      provPlatformDebug('With scopes: ' + scopes);
      token = await Auth.getAccessToken(scopes, this, _classPrivateFieldGet(_ENCRYPTIONKEY2, this), _classPrivateFieldGet(_Database, this));
    } else {
      provPlatformDebug('Access_token found');
      token = result[0].token;
    }
    token.token_type = token.token_type.charAt(0).toUpperCase() + token.token_type.slice(1);
    return token;
  }

  /**
   * @description Retrieves the platform information as a JSON object.
   */
  async platformJSON() {
    const platformJSON = {
      id: _classPrivateFieldGet(_kid, this),
      url: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this),
      name: _classPrivateFieldGet(_platformName, this),
      authenticationEndpoint: _classPrivateFieldGet(_authenticationEndpoint, this),
      accesstokenEndpoint: _classPrivateFieldGet(_accesstokenEndpoint, this),
      authorizationServer: _classPrivateFieldGet(_authorizationServer, this) || _classPrivateFieldGet(_accesstokenEndpoint, this),
      authConfig: _classPrivateFieldGet(_authConfig2, this),
      publicKey: await this.platformPublicKey(),
      active: await this.platformActive()
    };
    return platformJSON;
  }

  /**
   * @description Deletes a registered platform.
   */
  async delete() {
    await _classPrivateFieldGet(_Database, this).Delete('platform', {
      platformUrl: _classPrivateFieldGet(_platformUrl, this),
      clientId: _classPrivateFieldGet(_clientId, this)
    });
    await _classPrivateFieldGet(_Database, this).Delete('platformStatus', {
      id: _classPrivateFieldGet(_kid, this)
    });
    await _classPrivateFieldGet(_Database, this).Delete('publickey', {
      kid: _classPrivateFieldGet(_kid, this)
    });
    await _classPrivateFieldGet(_Database, this).Delete('privatekey', {
      kid: _classPrivateFieldGet(_kid, this)
    });
    return true;
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async remove() {
    console.log('Deprecation warning: The Platform.remove() method is now deprecated and will be removed in the 6.0 release. Use Platform.delete() instead.');
    return this.delete();
  }

  /* istanbul ignore next */
  /**
   * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint] - Platform authentication endpoint.
   * @deprecated
   */
  async platformAuthEndpoint(authenticationEndpoint) {
    return this.platformAuthenticationEndpoint(authenticationEndpoint);
  }
}
module.exports = Platform;