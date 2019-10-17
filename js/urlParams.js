/**
 * JavaScript Get URL Parameter
 *
 * @param prop The specific URL parameter you want to retreive the value for
 * @return String|Object If prop is provided a string value is returned, otherwise an object of all properties is returned
 */

export const getUrlParams = prop => {

    let params = {};
    const search = decodeURIComponent( window.location.href.slice( window.location.href.indexOf( '?' ) + 1 ) );

    search.split( '&' ).forEach( function( val, key ) {
        const parts = val.split( '=', 2 );
        params[ parts[ 0 ] ] = parts[ 1 ];
    } );

    return ( prop && prop in params ) ? params[ prop ] : params;
};
