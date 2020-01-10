module.exports = {
    PST: /(pst$|pt$)/i,
    MST: /(mst$|(?<!g)mt$)/i,
    CST: /(c(?!e)st$|ct$)/i,
    EST: /((?<!c)est$|et$)/i,
    IST: /(ist$|it$)/i,
    GMT: /(gmt$|london$)/i,
    CEST: /(cest$|warsaw$)/i,
    CTC: /(ctc$|china$)/i,
    HELP: /(help$)/i,
    UTC: /GMT(\+|-)[0-9][0-2]{0,1}$/i
};