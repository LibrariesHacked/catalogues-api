## Library Catalogues API

This is a web service project, with basic front-end, for searching multiple public library catalogues.

What it is
----------

In the UK there are around 200 public library authorities, each one with their own Library Management System and associated Online Public Access Catalogue (aside from some shared systems).

Despite being so many authorities, there are relatively few types of library systems, and fewer suppliers. This project aims to define the interactions with each type of web catalogue, to create a single set of web services for all UK libraries.

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
npm run start
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

Returns a list of the library service points in each library service. This may include mobile libraries, and different locations within individual library buildings.

| URL Route | Description | Example |
| ----- | ----------- | ------- |
| */libraries* | Returns a list of libraries for each service. | *http://localhost:3000/libraries* |
| */libraries?service=:service* | Filters the results to a particular library service. | *http://localhost:3000/libraries?service=Wiltshire* |

### Availability

Returns data showing the number of available/unavailable copies of the relevant title in each library service point, for each library service.

| Route | Description | Example |
| ----- | ----------- | ------- |
| */availabilityByISBN/:isbn* | Retrieves availability of a particular title by passing in ISBN.  | *http://localhost:3000/availabilityByISBN/9780747538493* |
| */availabilityByISBN/:isbn?service=:service* | Filters the results to a particular library service. | *http://localhost:3000/availabilityByISBN/9780747538493?service=Gloucestershire* |

Licence
-------

Original code licensed with [MIT Licence](Licence.txt).
