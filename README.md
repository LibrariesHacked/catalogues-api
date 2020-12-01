## Library Catalogues API

This is a web service project, with basic front-end, for searching multiple public library catalogues.

What it is
----------

In the UK there are around 200 public library authorities, each one with their own Library Management System and associated Online Public Access Catalogue (aside from some shared systems).

Despite being so many authorities, there are relatively few types of library systems, and fewer suppliers. This project aims to define the interactions with each type of web catalogue, in order to a single set of web services for all UK libraries.

This will provide data aggregation opportunities such as being able to query the UK for the availability of a particular book. Or it could provide functionality to manage a user's account across all their library accounts, such as automating book renewals.

Technologies used
-----------------

The following key plugins/technologies are used - more specific details in third party licensing section.

| Name | Description |
| ---- | ----------- |
| Node JS | Server side JavaScript technology for creating web applications |
| Web | There is a web front-end to this project in order to display a basic search screen. |

Authority Data
--------------

A list of UK public library authorities is included in the **data.json** file. This has the library authority name and the **type** of library service, along with specific data required to search that service e.g. the web URL. 

It includes the ONS authority code for each authority. This allows it to be combined with other datasets about that authority that may be published elsewhere.

For example:

| Name | Code | Type | URL | TestISBN |
| ---- | ---- | ---- | --- | -------- |
| Aberdeen City | S12000033 | spydus | https://aberdeencity.spydus.co.uk/ | 9780747538493 |

Build
-----

The project uses Node Package Manager (NPM) for package management. On downloading a copy of the project the required dependencies should be installed. Assuming [Node](https://nodejs.org/en/) is already installed, to build:

```bash
npm install
```

Run and deployment
------------------

The solution can be run on a local system with [Node JS](https://nodejs.org/) installed. The solution will be available under localhost at **http://localhost:3000/**.

```bash
node server.js
```

The solution can be deployed into any production environment set up to run a [Node JS Project](https://nodejs.org/en/).

Using the web service
---------------------

The project implements the following web services.

| Service | Description |
| ------- | ----------- |
| Services | Returns stored data about library services (authorities). |
| Libraries | Returns branch/location information, taken from the online catalogue. |
| Availability | Returns availability of a particular book. |

### Services

Returns selected contents of the data.json file for each service. This can be useful if a developer wished to create an interface that first listed the library authorities to be used in a search filter.

| URL Route | Description | Example |
| ----- | ----------- | ------- |
| */services* | Returns a list of library authorities | *http://localhost:3000/services* |

### Libraries

Returns a list of the library service points for each library service. This may include mobile libraries, and different locations within individual library buildings.

| URL Route | Description | Example |
| ----- | ----------- | ------- |
| */libraries* | Returns a list of libraries for each service. | *http://localhost:3000/libraries* |
| */libraries?service=:service* | Filters the results to a particular library service. | *http://localhost:3000/libraries?service=Wiltshire* |

### Availability

Returns data showing the number of available/unavailable copies of the relevant book in each library service point, for each library service.

| Route | Description | Example |
| ----- | ----------- | ------- |
| */availabilityByISBN/:isbn* | Retrieves availability of a particular book by passing in ISBN.  | *http://localhost:3000/availabilityByISBN/9780747538493* |
| */availabilityByISBN/:isbn?service=:service* | Filters the results to a particular library service. | *http://localhost:3000/availabilityByISBN/9780747538493?service=Gloucestershire* |

Third party licensing
---------------------

In addition to Node, the project uses a number of third party plugins.

### Web services

| Name | Description | Link | Licence |
| ---- | ----------- | ---- | ------- |
| Async | A utility module which provides straight-forward, powerful functions for working with asynchronous JavaScript | [Async](http://caolan.github.io/async/) | [MIT](https://github.com/caolan/async/blob/master/LICENSE) |
| Cheerio | Provides parsing and querying of HTML | [Cheerio on GitHub](https://github.com/cheeriojs/cheerio) | [MIT](https://github.com/cheeriojs/cheerio/blob/master/Readme.md) |
| Xml2js | Converts XML into JavaScript Objects | [xml2js on GitHub](https://github.com/Leonidas-from-XIV/node-xml2js) | [MIT](https://github.com/Leonidas-from-XIV/node-xml2js/blob/master/LICENSE) |
| Express | Minimalist web application framework for Node | [Express on GitHub](https://github.com/expressjs/express) | [MIT](https://github.com/expressjs/express/blob/master/LICENSE) |
| Request | Simplified HTTP requests framework | [Request on GitHub](https://github.com/request/request) | [Apache](https://github.com/request/request/blob/master/LICENSE) |

### Front-end

| Name | Description | Link | Licence |
| ---- | ----------- | ---- | ------- |
| Pug | Template engine for NodeJS | [Pug](https://github.com/pugjs/pug) | [MIT](https://github.com/pugjs/pug/blob/master/LICENSE) |
| Bookstrap 4 | Latest beta release of the front-end web development framework (Currently v4.0.0-beta.2) | [Bootstrap 4](https://v4-alpha.getbootstrap.com) | [MIT](https://github.com/twbs/bootstrap/blob/v4-dev/LICENSE) |
| jQuery | Required by Bootstrap and used for general JavaScript shortcuts | [jQuery](https://jquery.com/) | [MIT](https://github.com/jquery/jquery/blob/master/LICENSE.txt) |
| Bookstrap Typahead | Provides autocomplete functionality for textboxes, tailored for Bootstrap | [Bootstrap 3 Typahead on GitHub](https://github.com/bassjobsen/Bootstrap-3-Typeahead) | [Open Source](https://github.com/bassjobsen/Bootstrap-3-Typeahead) |
| Font Awesome | Font and CSS toolkit for vector icons | [Font Awesome](http://fontawesome.io) | [SIL OFL 1.1/MIT](https://github.com/FortAwesome/Font-Awesome) |
| Leaflet | Lightweight JavaScript interactive map framework | [Leaflet](http://leafletjs.com/) | [Open Source](https://github.com/Leaflet/Leaflet/blob/master/LICENSE) |

Licence
-------

Original code licensed with [MIT Licence](Licence.txt).
