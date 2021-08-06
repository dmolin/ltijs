// Dependencies
const consToolDebug = require('debug')('lti:tool')
const { v4: uuidv4 } = require('uuid')

// Classes
const ToolLink = require('./ToolLink')
const Database = require('../../../GlobalUtils/Database')
const Keyset = require('../../../GlobalUtils/Keyset')

// Helpers
const validScopes = require('../../../GlobalUtils/Helpers/scopes')
const privacyLevels = require('../../../GlobalUtils/Helpers/privacy')

/**
 * @description Class representing a registered tool.
 */
class Tool {
  #clientId

  #deploymentId

  #url

  #deepLinkingUrl

  #loginUrl

  #redirectionURIs

  #name

  #description

  #authConfig

  #scopes = []

  #privacy

  #customParameters = {}

  #kid

  /**
   * @param {string} clientId - Tool Client Id.
   * @param {string} deploymentId - Tool deployment Id.
   * @param {string} url - Tool url.
   * @param {string} deepLinkingUrl - Tool deep linking url.
   * @param {string} loginUrl - Tool login url.
   * @param {string} redirectionURIs - Tool redirection URIs.
   * @param {string} name - Tool name.
   * @param {string} description - Tool description.
   * @param {Object} authConfig - Authentication configurations for the tool.
   * @param {Array<String>} scopes - Scopes allowed for the tool.
   * @param {Number} privacy - Privacy level.
   * @param {Object} customParameters - Globally set custom parameters.
   * @param {string} kid - Key id for local keypair used to sign messages to this tool.
  */
  constructor (clientId, deploymentId, url, deepLinkingUrl, loginUrl, redirectionURIs, name, description, authConfig, scopes, privacy, customParameters, kid) {
    this.#clientId = clientId
    this.#deploymentId = deploymentId
    this.#url = url
    this.#deepLinkingUrl = deepLinkingUrl
    this.#loginUrl = loginUrl
    this.#redirectionURIs = redirectionURIs
    this.#name = name
    this.#description = description
    this.#authConfig = authConfig
    this.#scopes = scopes
    this.#privacy = privacy
    this.#customParameters = customParameters
    this.#kid = kid
  }

  // Static methods
  /**
   * @description Gets a registered Tool.
   * @param {String} clientId - Tool Client ID.
   * @returns {Promise<Tool | false>}
   */
  static async getTool (clientId) {
    if (!clientId) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    const result = await Database.get('tool', { clientId: clientId })
    if (!result) return false
    const _tool = result[0]
    const tool = new Tool(clientId, _tool.deploymentId, _tool.url, _tool.deepLinkingUrl, _tool.loginUrl, _tool.redirectionURIs, _tool.name, _tool.description, _tool.authConfig, _tool.scopes, _tool.privacy, _tool.customParameters, _tool.kid)
    return tool
  }

  /**
   * @description Gets all tools.
   * @returns {Promise<Array<Tool>>}
   */
  static async getAllTools () {
    const result = []
    const tools = await Database.get('tool')
    if (tools) {
      for (const _tool of tools) result.push(new Tool(_tool.clientId, _tool.deploymentId, _tool.url, _tool.deepLinkingUrl, _tool.loginUrl, _tool.redirectionURIs, _tool.name, _tool.description, _tool.authConfig, _tool.scopes, _tool.privacy, _tool.customParameters, _tool.kid))
    }
    return result
  }

  /**
   * @description Registers a tool.
   * @param {Object} tool - Tool configuration object.
   * @param {string} tool.url - Tool url.
   * @param {string} tool.name - Tool name.
   * @param {string} tool.loginUrl - Tool login url.
   * @param {Object} tool.authConfig - Authentication configurations for the tool.
   * @param {string} [tool.redirectionURIs] - Tool redirection URIs.
   * @param {string} [tool.deepLinkingUrl] - Tool deep linking url.
   * @param {string} [tool.clientId] - Tool Client Id.
   * @param {string} [tool.description] - Tool description.
   * @param {Array<String>} [tool.scopes] - Scopes allowed for the tool.
   * @param {Number} [tool.privacy] - Privacy level.
   * @param {Object} [tool.customParameters] - Globally set custom parameters.
   * @returns {Promise<Tool>}
   */
  static async registerTool (tool) {
    if (!tool || !tool.url || !tool.name || !tool.loginUrl || !tool.authConfig) throw new Error('MISSING_REGISTRATION_PARAMETERS')
    if (tool.authConfig.method !== 'RSA_KEY' && tool.authConfig.method !== 'JWK_KEY' && tool.authConfig.method !== 'JWK_SET') throw new Error('INVALID_AUTHCONFIG_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')
    if (!tool.authConfig.key) throw new Error('MISSING_AUTHCONFIG_KEY')

    if (!tool.description) tool.description = ''

    if (!tool.redirectionURIs) tool.redirectionURIs = []
    else if (!Array.isArray(tool.redirectionURIs)) throw new Error('INVALID_REDIRECTION_URIS_ARRAY')

    if (!tool.customParameters) tool.customParameters = {}
    else if (typeof tool.customParameters !== 'object') throw new Error('INVALID_CUSTOM_PARAMETERS_OBJECT')

    if (!tool.scopes) tool.scopes = []
    else {
      if (!Array.isArray(tool.scopes)) throw new Error('INVALID_SCOPES_ARRAY')
      for (const scope of tool.scopes) {
        if (!Object.keys(validScopes).includes(scope)) throw new Error('INVALID_SCOPE. Details: Invalid scope: ' + scope)
      }
    }

    tool.privacy = tool.privacy || privacyLevels.NONE

    if (tool.clientId) {
      const _tool = await Tool.getTool(tool.clientId)
      if (_tool) throw new Error('TOOL_ALREADY_REGISTERED')
    } else {
      tool.clientId = uuidv4()
      while (await Database.get('tool', { clientId: tool.clientId })) {
        tool.clientId = uuidv4()
      }
    }
    tool.deploymentId = uuidv4()
    while (await Database.get('tool', { deploymentId: tool.deploymentId })) {
      tool.deploymentId = uuidv4()
    }

    let kid
    try {
      consToolDebug('Registering new tool')
      consToolDebug('Tool Client ID: ' + tool.clientId)
      // Generating and storing RSA keys
      const keyPair = await Keyset.generateKeyPair()
      kid = keyPair.kid
      await Database.replace('publickey', { clientId: tool.clientId }, { key: keyPair.publicKey, kid: kid }, true, { kid: kid, clientId: tool.clientId })
      await Database.replace('privatekey', { clientId: tool.clientId }, { key: keyPair.privateKey, kid: kid }, true, { kid: kid, clientId: tool.clientId })

      // Storing new tool
      await Database.replace('tool', { clientId: tool.clientId }, { clientId: tool.clientId, deploymentId: tool.deploymentId, url: tool.url, deepLinkingUrl: tool.deepLinkingUrl, loginUrl: tool.loginUrl, redirectionURIs: tool.redirectionURIs, name: tool.name, description: tool.description, authConfig: tool.authConfig, scopes: tool.scopes, privacy: tool.privacy, customParameters: tool.customParameters, kid: kid })

      const _tool = new Tool(tool.clientId, tool.deploymentId, tool.url, tool.deepLinkingUrl, tool.loginUrl, tool.redirectionURIs, tool.name, tool.description, tool.authConfig, tool.scopes, tool.privacy, tool.customParameters, kid)
      return _tool
    } catch (err) {
      if (kid) {
        await Database.delete('publickey', { kid: kid })
        await Database.delete('privatekey', { kid: kid })
      }
      await Database.delete('tool', { clientId: tool.clientId })
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Updates a tool by the Id.
   * @param {String} clientId - Tool Client ID.
   * @param {string} toolInfo.url - Tool url.
   * @param {string} toolInfo.name - Tool name.
   * @param {string} toolInfo.loginUrl - Tool login url.
   * @param {Object} toolInfo.authConfig - Authentication configurations for the tool.
   * @param {string} toolInfo.redirectionURIs - Tool redirection URIs.
   * @param {string} toolInfo.deepLinkingUrl - Tool deep linking url.
   * @param {string} toolInfo.description - Tool description.
   * @param {Array<String>} toolInfo.scopes - Scopes allowed for the tool.
   * @param {Number} toolInfo.privacy - Privacy level.
   * @param {Object} tool.customParameters - Globally set custom parameters.
   * @returns {Promise<Tool | false>}
   */
  static async updateTool (clientId, toolInfo) {
    if (!clientId) { throw new Error('MISSING_CLIENT_ID_PARAMETER') }
    if (!toolInfo) { throw new Error('MISSING_TOOL_INFO_PARAMETER') }

    const toolObject = await Tool.getTool(clientId)
    if (!toolObject) return false
    const tool = await toolObject.toJSON()

    const update = {
      url: toolInfo.url || tool.url,
      deepLinkingUrl: toolInfo.deepLinkingUrl || tool.deepLinkingUrl,
      loginUrl: toolInfo.loginUr || tool.loginUrl,
      redirectionURIs: toolInfo.redirectionURIs || tool.redirectionURIs,
      name: toolInfo.name || tool.name,
      description: toolInfo.description || tool.description,
      authConfig: toolInfo.authConfig || tool.authConfig,
      scopes: toolInfo.scopes || tool.scopes,
      privacy: toolInfo.privacy || tool.privacy,
      customParameters: toolInfo.customParameters || tool.customParameters
    }

    try {
      await Database.modify('tool', { clientId: clientId }, update)

      const _tool = new Tool(clientId, tool.deploymentId, update.url, update.deepLinkingUrl, update.loginUrl, update.redirectionURIs, update.name, update.description, update.authConfig, update.scopes, update.privacy, update.customParameters, tool.kid)
      return _tool
    } catch (err) {
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Deletes a tool.
   * @param {string} clientId - Tool Client Id.
   * @returns {Promise<true>}
   */
  static async deleteTool (clientId) {
    if (!clientId) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    const tool = await Tool.getTool(clientId)
    if (tool) await tool.delete()
    return true
  }

  // Instance methods
  /**
   * @description Registers a toolLink.
   * @param {Object} toolLink - Tool Link configuration object.
   * @param {string} toolLink.name - Tool Link name.
   * @param {string} [toolLink.url] - Tool Link url.
   * @param {string} [toolLink.description] - Tool Link description.
   * @param {Number} [toolLink.privacy] - Privacy level.
   * @param {Object} [toolLink.customParameters] - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink>}
   */
  async registerToolLink (toolLink) {
    return ToolLink.registerToolLink(this, toolLink)
  }

  /**
   * @description Retrieves a toolLink.
   * @param {String} id - Tool Link ID
   * @returns {Promise<ToolLink>}
   */
  async getToolLink (id) {
    return ToolLink.getToolLink(id)
  }

  /**
   * @description Updates a toolLink.
   * @param {string} id - Tool Link ID.
   * @param {object} toolLinkInfo - Tool Link Information
   * @param {string} toolLinkInfo.url - Tool Link url.
   * @param {string} toolLinkInfo.name - Tool Link name.
   * @param {string} toolLinkInfo.description - Tool Link description.
   * @param {number} toolLinkInfo.privacy - Privacy level.
   * @param {Object} tool.customParameters - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink>}
   */
  async updateToolLink (id, toolLinkInfo) {
    return ToolLink.updateToolLink(id, toolLinkInfo)
  }

  /**
   * @description Gets all tool links related to this tool.
   * @returns {Promise<Array<ToolLink>>}
   */
  async getAllToolLinks () {
    return ToolLink.getAllToolLinks(this.#clientId)
  }

  /**
   * @description Gets the tool client id.
   */
  async clientId () {
    return this.#clientId
  }

  /**
   * @description Gets the tool deployment id.
   */
  async deploymentId () {
    return this.#deploymentId
  }

  /**
   * @description Gets/Sets the tool url.
   */
  async url () {
    return this.#url
  }

  /**
   * @description Gets/Sets the tool login url.
   */
  async loginUrl () {
    return this.#loginUrl
  }

  /**
   * @description Gets/Sets the tool redirection URIs.
   */
  async redirectionURIs () {
    return this.#redirectionURIs
  }

  /**
   * @description Gets/Sets the tool scopes.
   */
  async scopes () {
    return this.#scopes
  }

  /**
   * @description Gets/Sets the tool privacy level.
   */
  async privacy () {
    return this.#privacy
  }

  /**
   * @description Gets/Sets the tool deep linking url.
   */
  async deepLinkingUrl () {
    return this.#deepLinkingUrl || this.#url
  }

  /**
   * @description Sets/Gets the tool name.
   * @param {string} [name] - Tool name.
   */
  async name (name) {
    if (!name) return this.#name
    await Database.modify('tool', { clientId: this.#clientId }, { name: name })
    this.#name = name
    return name
  }

  /**
   * @description Gets/Sets the tool authorization configurations used to validate it's messages.
   * @param {object} authConfig - Authorization configuration object.
   * @param {string} authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {string} authConfig.key - Either the RSA public key provided by the Tool, the JWK key, or the JWK keyset address.
   */
  async authConfig (authConfig) {
    if (!authConfig) return this.#authConfig

    if (authConfig.method && authConfig.method !== 'RSA_KEY' && authConfig.method !== 'JWK_KEY' && authConfig.method !== 'JWK_SET') throw new Error('INVALID_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')

    const _authConfig = {
      method: authConfig.nmethod || this.#authConfig.method,
      key: authConfig.key || this.#authConfig.key
    }

    await Database.modify('tool', { clientId: this.#clientId }, { authConfig: _authConfig })
    this.#authConfig = _authConfig
    return authConfig
  }

  /**
   * @description Gets the tool key id.
   */
  async kid () {
    return this.#kid
  }

  /**
   * @description Gets the RSA public key assigned to the tool.
   *
   */
  async publicKey () {
    const key = await Database.get('publickey', { kid: this.#kid }, true)
    return key[0].key
  }

  /**
   * @description Gets the RSA private key assigned to the tool.
   *
   */
  async privateKey () {
    const key = await Database.get('privatekey', { kid: this.#kid }, true)
    return key[0].key
  }

  /**
   * @description Retrieves the tool information as a JSON object.
   */
  async toJSON () {
    const JSON = {
      kid: this.#kid,
      url: this.#url,
      clientId: this.#clientId,
      deploymentId: this.#deploymentId,
      name: this.#name,
      description: this.#description,
      authConfig: this.#authConfig,
      deepLinkingUrl: this.#deepLinkingUrl || this.#url,
      loginUrl: this.#loginUrl,
      redirectionURIs: this.#redirectionURIs,
      scopes: this.#scopes,
      privacy: this.#privacy,
      customParameters: this.#customParameters,
      publicKey: await this.publicKey()
    }
    return JSON
  }

  /**
   * @description Deletes a registered tool.
   */
  async delete () {
    await Database.delete('tool', { clientId: this.#clientId })
    await Database.delete('toollink', { clientId: this.#clientId })
    await Database.delete('publickey', { kid: this.#kid })
    await Database.delete('privatekey', { kid: this.#kid })
    return true
  }
}

module.exports = Tool