/* eslint-disable */
const useGlobalIconFont = () => {
  return {
    'iconfont': `../snapshots/iconfont-js/${process.env.TARO_ENV}/${process.env.TARO_ENV}`,
  };
};

// es modules is unavaiable.
module.exports.useGlobalIconFont = useGlobalIconFont;
