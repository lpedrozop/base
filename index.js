import { gql } from "apollo-server";
import { ApolloServer } from "apollo-server";

import fs from "fs";

const rawData = fs.readFileSync("chats.json");
const chats = JSON.parse(rawData);

//Definimos Graphql
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    chats: [Chat!]!
  }

  type Message {
    id: ID!
    text: String!
    createdAt: String!
    user: User!
  }

  type Chat {
    id: ID!
    messages: [Message!]!
    users: [User!]!
  }

  type Query {
    chats: [Chat!]!
    chat(id: ID!): Chat
    messages(chatId: ID!): [Message!]!
    searchChats(query: String!): [Chat!]!
    searchMessages(query: String!): [Message!]!
  }

  type Mutation {
    createChat(userIds: [ID!]!): Chat!
    sendMessage(chatId: ID!, userId: ID!, text: String!): Message!
  }
`;

//Resolvers
const resolvers = {
  Query: {
    chats: () => {
      return chats;
    },
    chat: (parent, { id }) => {
      return chats.find((chat) => chat.id === id);
    },
    messages: (parent, { chatId }) => {
      const chat = chats.find((chat) => chat.id === chatId);
      return chat ? chat.messages : [];
    },
    searchChats: (parent, { query }) => {
      return chats.filter((chat) =>
        chat.users.some((user) =>
          user.name.toLowerCase().includes(query.toLowerCase())
        )
      );
    },
    searchMessages: (parent, { query }) => {
      const allMessages = chats.reduce(
        (acc, chat) => acc.concat(chat.messages),
        []
      );
      return allMessages.filter((message) =>
        message.text.toLowerCase().includes(query.toLowerCase())
      );
    },
  },
  Mutation: {
    createChat: (parent, { userIds }) => {
      const newChat = {
        id: String(chats.length + 1),
        users: userIds.map((userId) => ({
          id: userId,
          name: getUserById(userId).name,
        })),
        messages: [],
      };
      chats.push(newChat);
      return newChat;
    },
    sendMessage: (parent, { chatId, userId, text }) => {
      const chat = chats.find((chat) => chat.id === chatId);
      if (!chat) {
        throw new Error("Chat no encontrado");
      }
      const user = getUserById(userId);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }
      const message = {
        id: String(chat.messages.length + 1),
        text,
        createdAt: new Date().toISOString(),
        user,
      };
      chat.messages.push(message);
      return message;
    },
  },
  Chat: {
    messages: (parent) => {
      return parent.messages;
    },
    users: (parent) => {
      return parent.users.map((user) => getUserById(user.id));
    },
  },
  User: {
    chats: (parent) => {
      return chats.filter((chat) =>
        chat.users.some((user) => user.id === parent.id)
      );
    },
  },
};

function getUserById(userId) {
  const allUsers = chats.map((chat) => chat.users).flat(); 
  const user = allUsers.find((user) => user.id === userId);
  return user ? user : null;
}

//Servidor
const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(` Servidor listo en ${url}`);
});
