const { Schema, model } = require("../../config/config") // import Schema & model
const referralCodeGenerator = require('referral-code-generator')

// User Schema
const UserSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Active'],
        default: 'Pending'
    },
    confirmationCode: {
        type: String,
        unique: true
    },
    role: {
        type: String,
        default: 'user'
    },
    referralCode: {
        type: String,
        default: referralCodeGenerator.alpha('lowercase', 12)
    },
    referred: {
        type: Number,
        default: 0
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    bybitaccount: [{
        type: Schema.Types.ObjectId,
        ref: 'Bybitaccount',
        required: true
    }],
    strategies: [{
        type: Schema.Types.ObjectId,
        ref: 'Strategies',
        required: true
    }],
    referredUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],

})


// Exclude the password field from the returned data
UserSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password;
        return ret;
    }
});

UserSchema.statics = {

    async userListField() {
        var list = ['_id', 'username', 'email', 'status', 'role']
        return list;
    }

}
// User model
const User = model("User", UserSchema);

module.exports = User
