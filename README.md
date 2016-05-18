# UK Public Libraries Catalogue Web Service

A web service project for searching multiple UK public library catalogues.

## What is it?

In the UK there are around 200 public library authorities, each one with their own Library Management System (LMS) and associated Online Public Access Catalogue (OPAC).

Despite being so many authorities, there are relatively few types of library systems.  This project aims to define the interaction with each **type** of public access catalogue in order to apply this for all UK library services.

This will provide data aggregation opportunities such as being able to query the UK for the availability of a particular book, or manage a user's account across all their library services.

## Technologies used

The following key plugins/technologies are used - more specific details in third party licensing section.

| Name | Description |
| ---- | ----------- |
| Node JS | Server side JavaScript technology for creating web applications. |

## Authority Data

A list of UK public library authorities is included in the data.json file.  This has the library authority name and the **type** of library service, along with specific data required to search that service e.g. the web URL. 

It also includes data such as the library authority twitter account, and any twitter accounts owned by branch/mobile libraries within that authority.

## Build

The project uses Node Package Manager (NPM) for package management.  On downloading a copy of the project the required dependencies should be installed.

```
npm install packages
```

## Run and deployment

The solution can be run on a local system.  The solution will be available under localhost at http://localhost:3000/.

```
node server.js
```

The solution can be deployed into any production environment set up to run a [Node JS Project](https://nodejs.org/en/).

## Using the web service

The project implements the following web services.

| Service | Description |
| ------- | ----------- |
| Services | Returns stored data about library services. |
| Libraries | Queries library services for branches, taken from the online catalogue. |
| AvailabilityByISBN | Queries library services for a particular ISBN and returns availability. |

### Services

Returns selected contents of the data.json file for each service.  This can be useful if wanting to create an interface that lists the library authorities to then be used in a search filter for retrieving other data.

### Libraries

| Route | Description | Example |
| ----- | ----------- | ------- |
| /libraries | Returns a list of libraries for each service. | http://localhost:3000/libraries |
| /libraries?service=:service | Filters the results to a particular library service. | http://localhost:3000/libraries?service=Wiltshire | 

Queries the library catalogues for the existing of branches within that authority.

### Availability By ISBN

| Route | Description | Example |
| ----- | ----------- | ------- |
| /availabilityByISBN/:isbn | Retrieves availability of a partiucular book by passing in ISBN.  | http://localhost:3000/availabilityByISBN/1234567891012 |
| /availabilityByISBN/:isbn?service=:service | Filters the results to a particular library service. | http://localhost:3000/availabilityByISBN/1234567891012?library=Gloucestershire | 

Returns data showing the number of available/unavailable copies of the relevant book in each branch, for each library service.

## Third party licensing

In addition to Node, the project uses a number of third party plugins.

| Name | Description | Link | Licence |
| ---- | ----------- | ---- | ------- |
| Cheerio | Provides parsing and querying of HTML.  | [Cheerio on GitHub](https://github.com/cheeriojs/cheerio) | [MIT](https://github.com/cheeriojs/cheerio/blob/master/Readme.md) |
| XML2JS | Converts XML into JavaScript Objects. | [XML2JS on GitHub](https://github.com/Leonidas-from-XIV/node-xml2js) | [MIT](https://github.com/Leonidas-from-XIV/node-xml2js/blob/master/LICENSE) |
| Express | Minimalist web application framework for Node. | [Express on GitHub](https://github.com/expressjs/express) | [MIT](https://github.com/expressjs/express/blob/master/LICENSE) |
| Request | Simplified HTTP requests framework. | [Request on GitHub](https://github.com/request/request) | [Apache](https://github.com/request/request/blob/master/LICENSE) |

## Licence

Original code licensed with [MIT Licence](Licence.txt).