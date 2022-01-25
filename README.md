## Library Catalogues API

This is a web service project, with basic front-end, for searching multiple public library catalogues. It implements the [catalogues-library](https://github.com/LibrariesHacked/catalogues-library) project and exposes it as an API.

## Build

The project uses Node Package Manager (NPM) for package management. Assuming [Node](https://nodejs.org/en/) is already installed, to build:

```bash
npm install
```

## Run and deployment

The solution can be run on a local system with [Node JS](https://nodejs.org/) installed. The solution will be available under localhost at **http://localhost:3000/**.

```bash
npm run start
```

Load the documentation at ```http://localhost:3000/api```

The solution can be deployed into any production environment set up to run Node.

## Using the API

The project implements the following endpoints.

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
| */availability/:isbn* | Retrieves availability of a particular title by passing in ISBN.  | *http://localhost:3000/availability/9780747538493* |
| */availability/:isbn?service=:service* | Filters the results to a particular library service. | *http://localhost:3000/availability/9780747538493?service=Gloucestershire* |

## Licence

Original code licensed with [MIT Licence](Licence.md).
