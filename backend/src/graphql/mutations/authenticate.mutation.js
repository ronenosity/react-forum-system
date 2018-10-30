import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { UserType } from '../types/user.type';
import { Response, NOT_FOUND, MISSING_PARAMETERS } from '../utils/responses.utils';

export const AuthenticateMutation = (security, db, auth) => ({
  type: UserType,
  args: {
    email: { type: GraphQLNonNull(GraphQLString) },
    password: { type: GraphQLNonNull(GraphQLString) },
  },
  resolve: async (root, { email, password }, { cookie }) => {
    if (email === '' || password === '') return MISSING_PARAMETERS;
    const user = await db.user.findOne({ email });
    if (!user) return NOT_FOUND;
    const equalPasswords = await user.comparePassword(password);
    if (!equalPasswords) return new GraphQLError(Response({ status: 400, message: 'Bad Request' }));
    let authToken;
    try {
      authToken = await auth.generateToken({ identifier: user._id, email: user.email });
    } catch (error) {
      console.log({ error });
      return new GraphQLError(
        Response({
          status: 500,
          message: `An error ocurred while generating the authentication token for the user.`,
        }),
      );
    }
    cookie('token', authToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });
    return user.toObject();
  },
});
