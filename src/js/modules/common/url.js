const getHostSite = () => {
    const ref = document.referrer,
        liste = ['ledauphine.com', 'leprogres.fr', 'bienpublic.com', 'lejsl.com', 'estrepublicain.fr', 'vosgesmatin.fr', 'lalsace.fr', 'dna.fr'].map(d=>`https://www.${d}/`);
    if (ref) {
        return (liste.includes(ref)) ? ref: undefined;
    }
    else return undefined;
}

const getUrlParam = (key) => {
    let params = new URLSearchParams(window.location.search);
    return params.get(key);
}

class UrlParam{
    constructor(){
        if (UrlParam._instance) {
            return UrlParam._instance;
        }
        UrlParam._instance=this;
        this.params=new URLSearchParams(window.location.search);
        this.keys=Array.from(this.params.keys());
        console.log(this.keys);
    }

    getValuesFromKey(key){
        return this.params.get(key);
    }

    getFilterValues(){
        ['jours','semaine','dates'].forEach( key=>{
            let c=this.getValuesFromKey(key);
            if (c) {
                c=c.split(',');

                switch (key){
                    case 'jours': c=c.map( d=> parseInt(d,10));
                        return { jours: c };
                        break;
                    case 'semaine': c=c.map( d=> parseInt(d,10));
                        return { duree: 8};
                        break;
                }
            }

        })
    }
}

export {UrlParam}