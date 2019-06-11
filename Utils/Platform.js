
//Utis
const Database = require('./Database')
const jwk = require('pem-jwk')
const prov_platformdebug = require('debug')('provider:platform')
var ENCRYPTIONKEY

var auth_config

/**
 * @description Class representing a registered platform. 
 */
class Platform{
    /**
     * @param {string} name - Platform name.
     * @param {string} platform_url - Platform url. 
     * @param {string} client_id - Client Id generated by the platform.
     * @param {string} authentication_endpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {string} kid - Key id for local keypair used to sign messages to this platform.
     * @param {string} _ENCRYPTIONKEY - Encryption key used
     * @param {Object} _auth_config - Authentication configurations for the platform.
     */
    constructor(name, platform_url, client_id, authentication_endpoint, kid, _ENCRYPTIONKEY, _auth_config){
        auth_config = _auth_config
        ENCRYPTIONKEY = _ENCRYPTIONKEY

        if(!name) {
            console.error("Error registering platform. Missing argument.")
            return false
        }

        this.platform_name = name
        this.platform_url = platform_url 
        this.client_id = client_id 
        this.auth_endpoint =  authentication_endpoint 
        this.kid = kid

        if(!Database.Get(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms',{platform_url: this.platform_url})){
            prov_platformdebug("Registering new platform: " + this.platform_url)
            Database.Insert(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_name: this.platform_name, platform_url: this.platform_url, client_id: this.client_id, auth_endpoint: this.auth_endpoint, kid: this.kid, auth_config: auth_config})
        }
        

    }



    /**
     * @description Sets/Gets the platform name.
     * @param {string} [name] - Platform name.
     */
    platformName(name){
        if(!name) return this.platform_name
        
        Database.Modify(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: this.platform_url}, {platform_name: name})
        
        this.platform_name = name
    }


    /**
     * @description Sets/Gets the platform url.
     * @param {string} [url] - Platform url.
     */
    platformUrl(url){
        if(!url) return this.platform_url

        Database.Modify(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: this.platform_url}, {platform_url: url})

        this.platform_url = url
    }




    /**
     * @description Sets/Gets the platform client id.
     * @param {string} [client_id] - Platform client id.
     */
    platformClientId(client_id){
        if(!client_id) return this.client_id
        
        Database.Modify(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: this.platform_url}, {client_id: client_id})

        this.client_id = client_id
    }


    /**
     * @description Gets the platform key_id.
     */
    platformKid(){
        return this.kid
    }


    /**
     * @description Gets the Jwk public key assigned to the platform.
     *
     */
    platformPublicKeyJwk(){
        return Database.Get(false, './provider_data', 'publickeyset', 'keys', {kid: this.kid})
    }

    /**
     * @description Gets the RSA public key assigned to the platform.
     *
     */
    platformPublicKeyRSA(){
        return jwk.jwk2pem(Database.Get(false, './provider_data', 'publickeyset', 'keys', {kid: this.kid}))
    }


     /**
     * @description Gets the Jwk private key assigned to the platform.
     *
     */
    platformPrivateKeyJwk(){
        return Database.Get(false, './provider_data', 'privatekeyset', 'keys', {kid: this.kid})
    }

    /**
     * @description Gets the RSA private key assigned to the platform.
     *
     */
    platformPrivateKeyRSA(){
        return jwk.jwk2pem(Database.Get(false, './provider_data', 'privatekeyset', 'keys', {kid: this.kid}))
    }


    /**
     * @description Sets/Gets the platform authorization configurations used to validate it's messages.
     * @param {string} method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {string} key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
    platformAuthConfig(method, key){
        if(!method && !key) return auth_config

        if(method != "RSA_KEY" && method != "JWK_KEY" && method != "JWK_SET"){
            console.error('Invalid message validation method. Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET"')
            return false
        }
        if(!key){
            console.error("Missing secong argument key or keyset_url.")
            return false
        }

        auth_config = {
            method: method,
            key: key
        }

        Database.Modify(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: this.platform_url}, {auth_config: auth_config})
        
       
    }

     /**
     * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
     * @param {string} [auth_endpoint] - Platform authorization endpoint.
     */
    platformAuthEndpoint(auth_endpoint){
        if(!auth_endpoint) return this.auth_endpoint
        
        Database.Modify(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: this.platform_url}, {auth_endpoint: auth_endpoint})
        
        this.auth_endpoint = auth_endpoint
    }

    /**
     * @description Deletes a registered platform.
     */
    remove(){

        Database.Delete(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', { platform_url: this.platform_url })

        Database.Delete(false, './provider_data', 'publickeyset', 'keys', {kid: this.kid})

        Database.Delete(false, './provider_data', 'privatekeyset', 'keys', {kid: this.kid})

        return true
    }
    
}

module.exports = Platform