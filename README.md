## @hubroeducation/ltijs Fork

This is a fork of the original LTIJS@5.8.9 from <a href="https://github.com/Cvmcosta/ltijs">Cvcosta</a>.
The main difference is a patch that makes *serverless* mode properly work when your LTIJS Express server is mounted in a dedicated subpath of your existing Web application (like: "/ltitool"). This is currently not working in the main LTIJS repository

This fork allows you to specify the path your LTIJS serverless installation is attached on, so the library will always be able to reference the correct complete URL in case of redirects.

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>



> Easily turn your web application into a LTI® 1.3 Learning Tool.

> Ltijs is the first LTI Library to implement the new [LTI® Advantage Dynamic Registration Service](https://cvmcosta.me/ltijs/#/dynamicregistration), now supported by **Moodle 3.10**. 
> The Dynamic Registration Service turns the LTI Tool registration flow into a fast, completely automatic process.

> - [Migrating from version 4](https://cvmcosta.github.io/ltijs/#/migration)
> - [CHANGELOG](https://cvmcosta.github.io/ltijs/#/changelog)

---

## Table of Contents

- [Introduction](#introduction)
- [Feature roadmap](#feature-roadmap)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)


---
## Introduction

The Learning Tools Interoperability (LTI®) protocol is a standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This library implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI® 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool with access to every LTI® service, without having to worry about manually implementing any of the security and validation required to do so. 


---

## Feature roadmap

| Feature | Implementation | Documentation |
| --------- | - | - |
| [Keyset endpoint support](https://cvmcosta.me/ltijs/#/provider?id=keyset-endpoint) | <center>✔️</center> | <center>✔️</center> |
| [Deep Linking Service Class](https://cvmcosta.me/ltijs/#/deeplinking) | <center>✔️</center> | <center>✔️</center> |
| [Grading Service Class](https://cvmcosta.me/ltijs/#/grading) | <center>✔️</center> | <center>✔️</center> |
| [Names and Roles Service Class](https://cvmcosta.me/ltijs/#/namesandroles) | <center>✔️</center> | <center>✔️</center> |
| [Dynamic Registration Service ](https://cvmcosta.me/ltijs/#/dynamicregistration) | <center>✔️</center> | <center>✔️</center> |
| Database plugins | <center>✔️</center> | <center>✔️</center> |
| Revised usability tutorials | <center></center> | <center></center> |
| Key Rotation | <center></center> | <center></center> |
| Redis caching | <center></center> | <center></center> |


---


## Installation

### Installing the package

```shell
$ npm install ltijs
```


### MongoDB

This package natively uses mongoDB by default to store and manage the server data, so you need to have it installed, see link below for further instructions.

  - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


### Database Plugins

Ltijs can also be used with other databases through database plugins that use the same structure as the main database class.

  -  [Firestore Plugin](https://github.com/examind-ai/ltijs-firestore)
 
  -  [Sequelize Plugin](https://github.com/Cvmcosta/ltijs-sequelize)(MySQL, PostgreSQL)



---


## Quick start

> Setting up Ltijs



```javascript
const path = require('path')

// Require Provider 
const lti = require('ltijs').Provider

// Setup provider
lti.setup('LTIKEY', // Key used to sign cookies and tokens
  { // Database configuration
    url: 'mongodb://localhost/database',
    connection: { user: 'user', pass: 'password' }
  },
  { // Options
    appRoute: '/', loginRoute: '/login', // Optionally, specify some of the reserved routes
    cookies: {
      secure: false, // Set secure to true if the testing platform is in a different domain and https is being used
      sameSite: '' // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
    },
    devMode: true // Set DevMode to false if running in a production environment with https
  }
)

// Set lti launch callback
lti.onConnect((token, req, res) => {
  console.log(token)
  return res.send('It\'s alive!')
})

const setup = async () => {
  // Deploy server and open connection to the database
  await lti.deploy({ port: 3000 }) // Specifying port. Defaults to 3000

  // Register platform
  await lti.registerPlatform({
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
  })
}

setup()
```

### Implementation example

 - [Example Ltijs Server](https://github.com/Cvmcosta/ltijs-demo-server)

 - [Example Client App](https://github.com/Cvmcosta/ltijs-demo-client)

---

## Documentation

See bellow for the complete documentation:

### [Ltijs Documentation](https://cvmcosta.github.io/ltijs/#/provider)

Service documentations:
   - [Deep Linking Service documentation](https://cvmcosta.github.io/ltijs/#/deeplinking)
   - [Grading Service documentation](https://cvmcosta.github.io/ltijs/#/grading)
   - [Names and Roles Provisioning Service documentation](https://cvmcosta.github.io/ltijs/#/namesandroles)
   - [Dynamic Registration Service documentation](https://cvmcosta.me/ltijs/#/dynamicregistration)

Additional documentation:

   - [Platform class documentation](https://cvmcosta.github.io/ltijs/#/platform) 


---

## Contributing

If you feel like it, you can donate any amount through paypal to the original author (<a href="https://github.com/Cvmcosta/ltijs">Cvcosta</a>) with a button below, it helps a lot.

<a href="https://www.buymeacoffee.com/UL5fBsi" target="_blank"><img width="217" src="https://cdn.buymeacoffee.com/buttons/lato-green.png" alt="Buy Cvcosta A Coffee"></a>


---

## Special thanks

> A great THANK YOU to <a href="https://github.com/Cvmcosta/ltijs">Cvcosta</a> for the original implementation, that saved us a TONS of time/work in our project.


---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)

> *Learning Tools Interoperability® (LTI®) is a trademark of the IMS Global Learning Consortium, Inc. (https://www.imsglobal.org)*
