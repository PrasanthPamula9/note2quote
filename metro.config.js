const {getDefaultConfig,mergeConfig} = require('@react-native/metro-config');
const config = {
    resolver: {
       useWatchman: false,
    },
};
const defaultConfig = getDefaultConfig(__dirname);
module.exports = mergeConfig(defaultConfig, config);
