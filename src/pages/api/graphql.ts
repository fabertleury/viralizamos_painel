import { ApolloServer } from 'apollo-server-micro';
import { typeDefs } from '../../graphql/schema';
import { resolvers } from '../../graphql/resolvers';
import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'micro-cors';

const cors = Cors({
  allowMethods: ['POST', 'OPTIONS', 'GET', 'HEAD'],
});

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});

const startServer = apolloServer.start();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.end();
    return false;
  }
  
  await startServer;
  
  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default cors(handler); 