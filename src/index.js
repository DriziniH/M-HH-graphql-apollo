require('dotenv').config()

const { ApolloServer } = require('apollo-server');
const typeDefs = require('./schema');
const MongoAPI = require('./datasources/mongodb');
const resolvers = require('./resolvers');
const MongoClient = require('mongodb').MongoClient;
const { eurekaClient } = require('./eureka_client')

const port = 4001;

const context = async () => {
    try {
        const dbClient = new MongoClient(
            process.env.MONGO_DB_URI,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        )

        if (!dbClient.isConnected()) await dbClient.connect()
        db = dbClient.db('M-HH')
    } catch (e) {
        console.log('--->error while connecting with graphql context (db)', e)
    }

    return { db }
}

const dataSources = () => ({
    mongoDB: new MongoAPI()
});

const serverEU = new ApolloServer({
    typeDefs, 
    resolvers,
    dataSources,
    context
});

function exitHandler() {
    eurekaClient.stop();
}

eurekaClient.on('deregistered', () => {
    process.exit();
});

process.on('SIGINT', exitHandler);


serverEU.listen(port).then(({ url }) => {
    console.log("Registering with Eureka for EU instance...");
    eurekaClient.start(function (error) {
        if (error) {
            console.log(error);
        }
    });
    console.log(`Running on ${url}`);
});


