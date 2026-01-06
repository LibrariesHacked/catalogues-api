## Library catalogues API

This is a web service, with basic front-end, for searching multiple UK public library catalogues. It implements the [catalogues-library](https://github.com/LibrariesHacked/catalogues-library) JavaScript library and exposes it as an API and UI.

## Install

The project uses Node Package Manager (NPM) for package management. Assuming [Node](https://nodejs.org/en/) is already installed, run the install for project dependencies:

```console
npm install
```

## Run

The solution can be run on a local system with [Node JS](https://nodejs.org/) installed. The solution will be available under localhost at **http://localhost:3000/**.

```console
npm run start
```

You can load the Swagger/OpenAI documentation at `http://localhost:3000/api`

The solution can be deployed into any production environment set up to run Node.

## Using the API

The project implements the following endpoints.

| Endpoint     | Description                                                          |
| ------------ | -------------------------------------------------------------------- |
| Services     | Returns stored data about library services                           |
| Libraries    | Returns branch/location information, taken from the online catalogue |
| Availability | Returns availability of a particular book                            |

### Services

Returns stored information for each service. This can be useful if a developer wished to create an interface that listed the library authorities to be used in a search filter.

| URL Route       | Description                           | Example                              |
| --------------- | ------------------------------------- | ------------------------------------ |
| _/api/services_ | Returns a list of library authorities | _http://localhost:3000/api/services_ |

### Libraries

Returns a list of the library service points in each library service. This may include mobile libraries, and different locations within individual library buildings.

| URL Route                         | Description                                          | Example                            |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| _/api/libraries_                  | Returns a list of libraries for each service.        | _/api/libraries_                   |
| _/api/libraries?service=:service_ | Filters the results to a particular library service. | _/api/libraries?service=Wiltshire_ |

### Availability

Returns data showing the number of available/unavailable copies of the relevant title in each library service point, for each library service.

| Route                                      | Description                                          | Example                                                   |
| ------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------- |
| _/api/availability/:isbn_                  | Retrieves availability of a particular by ISBN.      | _/api/availability/9780747538493_                         |
| _/api/availability/:isbn?service=:service_ | Filters the results to a particular library service. | _/api/availability/9780747538493?service=Gloucestershire_ |

## Licence

Original code licensed with [MIT Licence](LICENCE.md).
