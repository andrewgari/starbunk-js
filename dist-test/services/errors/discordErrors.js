"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleNotFoundError = exports.GuildNotFoundError = exports.MemberNotFoundError = exports.UserNotFoundError = exports.ChannelNotFoundError = exports.DiscordServiceError = void 0;
// Custom error class for better error handling
var DiscordServiceError = /** @class */ (function (_super) {
    __extends(DiscordServiceError, _super);
    function DiscordServiceError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "DiscordServiceError";
        return _this;
    }
    return DiscordServiceError;
}(Error));
exports.DiscordServiceError = DiscordServiceError;
var ChannelNotFoundError = /** @class */ (function (_super) {
    __extends(ChannelNotFoundError, _super);
    function ChannelNotFoundError(channelId) {
        return _super.call(this, "Channel not found: ".concat(channelId)) || this;
    }
    return ChannelNotFoundError;
}(DiscordServiceError));
exports.ChannelNotFoundError = ChannelNotFoundError;
var UserNotFoundError = /** @class */ (function (_super) {
    __extends(UserNotFoundError, _super);
    function UserNotFoundError(userId) {
        return _super.call(this, "User not found: ".concat(userId)) || this;
    }
    return UserNotFoundError;
}(DiscordServiceError));
exports.UserNotFoundError = UserNotFoundError;
var MemberNotFoundError = /** @class */ (function (_super) {
    __extends(MemberNotFoundError, _super);
    function MemberNotFoundError(memberId) {
        return _super.call(this, "Member not found: ".concat(memberId)) || this;
    }
    return MemberNotFoundError;
}(DiscordServiceError));
exports.MemberNotFoundError = MemberNotFoundError;
var GuildNotFoundError = /** @class */ (function (_super) {
    __extends(GuildNotFoundError, _super);
    function GuildNotFoundError(guildId) {
        return _super.call(this, "Guild not found: ".concat(guildId)) || this;
    }
    return GuildNotFoundError;
}(DiscordServiceError));
exports.GuildNotFoundError = GuildNotFoundError;
var RoleNotFoundError = /** @class */ (function (_super) {
    __extends(RoleNotFoundError, _super);
    function RoleNotFoundError(roleId) {
        return _super.call(this, "Role not found: ".concat(roleId)) || this;
    }
    return RoleNotFoundError;
}(DiscordServiceError));
exports.RoleNotFoundError = RoleNotFoundError;
