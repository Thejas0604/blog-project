const passport = require("passport");
const User = require("../models/User/User");
const LocalStrategy = require("passport-local").Strategy;
const bcryptjs = require("bcryptjs");
const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJWT = require("passport-jwt").ExtractJwt;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new LocalStrategy(
    { usernameField: "username" },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        const isMatch = await bcryptjs.compare(password, user.password);
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Incorrect password" });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

//google oauth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/v1/user/auth/google/callback",
    },
    async (accessToken, refreshtoken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile?.id });
        //destructure the profile
        const {
          id,
          displayName,
          name,
          _json: { picture },
        } = profile;
        //check email
        let email = "";
        if (Array.isArray(profile?.emails) && profile?.emails.length > 0) {
          email = profile.emails[0].value;
        }
        if (!user) {
          user = await User.create({
            googleId: id,
            username: displayName,
            email: email,
            profileImage: picture,
            authMethod: "google",
          });
        }
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);
//jwt-options
const options = {
  jwtFromRequest: ExtractJWT.fromExtractors([
    (req) => {
      let token = null;
      if (req && req.cookies) {
        token = req.cookies["token"];
        return token;
      }
    },
  ]),
  secretOrKey: process.env.JWT_SECRET,
};
//jwt
passport.use(
  new JWTStrategy(options, async (userDecoded, done) => {
    try {
      const user = await User.findById(userDecoded?.id);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);
module.exports = passport;
