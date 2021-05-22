const { ApolloServer, gql } = require('apollo-server')
const axios = require('axios')
const { v4: uuid } = require('uuid')

let authors = [
  {
    name: 'Juanito Perez',
    id: 'afa51ab0-344d-11e9-a414-719c6709cf31',
    born: 2012,
  },
  {
    name: 'Robert Martin',
    id: 'afa51ab0-344d-11e9-a414-719c6709cf32',
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: 'afa5b6f0-344d-11e9-a414-719c6709cf33',
    born: 1963,
  },
  {
    name: 'Fyodor Dostoevsky',
    id: 'afa5b6f1-344d-11e9-a414-719c6709cf34',
    born: 1821,
  },
  {
    name: 'Joshua Kerievsky', // birthyear not known
    id: 'afa5b6f2-344d-11e9-a414-719c6709cf35',
  },
  {
    name: 'Sandi Metz', // birthyear not known
    id: 'afa5b6f3-344d-11e9-a414-719c6709cf36',
  },
]

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: 'afa5b6f4-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring'],
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: 'afa5b6f5-344d-11e9-a414-719c6709cf3e',
    genres: ['Agile', 'patterns', 'design'],
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: 'afa5de00-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring'],
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: 'afa5de01-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring', 'patterns'],
  },
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: 'afa5de02-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring', 'design'],
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: 'afa5de03-344d-11e9-a414-719c6709cf3e',
    genres: ['classic', 'crime'],
  },
  {
    title: 'The Demon',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: 'afa5de04-344d-11e9-a414-719c6709cf3e',
    genres: ['classic', 'Revolution'],
  },
]
let cats = []

const typeDefs = gql`
  enum YES_NO {
    YES
    NO
  }
  type Book {
    title: String!
    published: Int!
    author: String!
    genres: [String!]!
    id: ID!
  }
  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }
  type Cat {
    _id: String!
		text: String!
		sentCount: Int!
  }
  type Mutation {
    "Agrega un nuevo libro"
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String, setBornTo: Int): Author
    editCat(factId:String!,setText:String!):Cat
  }
  type Query {
    allBooks(author: String, genre: String): [Book!]!
    allAuthors(from2000: YES_NO): [Author!]!
    bookCount: Int!
    authorCount: Int!
    getCats(amount: Int!):[Cat!]!
    getCat(factId: String!):Cat
    getMyCats(userToken: String!):[Cat]
  }
`

const resolvers = {
  Query: {
    allBooks: (root, args) => {
      if (!args.author && !args.genre) {
        return books
      }

      if (args.author)
        books = books.filter((book) => book.author === args.author)

      if (args.genre) {
        return books.filter(
          (book) => book.genres.findIndex((genre) => genre == args.genre) !== -1
        )
      }
    },
    allAuthors: (root, args) => {
      const res = authors.map((author) => {
        const bookCount = books.reduce(
          (a, book) => (book.author == author.name ? a + 1 : a),
          0
        )
        return { ...author, bookCount }
      })
      if (args.from2000) return res.filter(author => {
        if (args.from2000 === 'YES' && author.born >=2000) return true
        if (args.from2000 === 'NO' && author.born < 2000) return true
      })
      return res
    },
    getCats: async(root, args) => {
      await axios.get("https://cat-fact.herokuapp.com/facts/?animal_type=cat&amount="+args.amount).then(
        async(json)=>{
          await json.data.map((cat)=>{
            let newCat = {
              "_id": cat._id,
              "text": cat.text,
              "sentCount": cat.status.sentCount
            }
            cats.push(newCat)
          })
      })
      return cats
    },
    getCat: async(root, args) => {
      let cat = {}
      await axios.get("https://cat-fact.herokuapp.com/facts/"+args.factId).then(
        async(json)=>{
          cat = json.data
      })
      return cat
    },
    getMyCats: async(root, args) => {
      let gatos = []
      await axios.get ("https://cat-fact.herokuapp.com/facts/me",{
        headers: {
          'X-Auth-Token': args.userToken
        }
      }).then(
        async(json)=>{
          await json.data.map((cat)=>{
            let newCat = {
              "_id": cat._id,
              "text": cat.text,
              "sentCount": cat.status.sentCount
            }
            gatos.push(newCat)
          })
        }
      )
      return gatos
    },
    bookCount: () => books.length,
    authorCount: () => authors.length,
  },
  Mutation: {
    addBook: (root, args) => {
      if (!authors.find((author) => author.name === args.author)) {
        const newAuthor = {
          name: args.author,
          id: uuid(),
        }
        authors = authors.concat(newAuthor)
      }

      const book = { ...args, id: uuid() }
      books = books.concat(book)
      return book
    },
    editCat: async (root,args)=>{
      await resolvers.Query.getCats(null,{amount:5})
      const cat= cats.find((cat)=>cat._id==args.factId)
      if (!cat) {
        return null
      }
      const updatedCat = { ...cat, text: args.setText }
      cats = cats.map((cat2) =>
        cat2.text === updatedCat.text ? updatedCat : cat2
      )
      return updatedCat
    },
    editAuthor: (root, args) => {
      const author = authors.find((a) => a.name === args.name)
      console.log(author)
      if (!author) {
        return null
      }
      const updatedAuthor = { ...author, born: args.setBornTo }
      authors = authors.map((author) =>
        author.name === updatedAuthor.name ? updatedAuthor : author
      )
      return updatedAuthor
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
