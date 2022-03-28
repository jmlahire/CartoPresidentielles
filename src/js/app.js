import '../style/style.scss'
import {Title} from './modules/html.component'
import {SvgMapComposition} from './modules/svg.map.composition';
import {SvgMapLayer} from './modules/svg.map.layer';
import {DataCollection} from "./modules/data.datacollection";
import {HtmlMenuSelect} from "./modules/html.menu.select";
import {HtmlContentBox} from "./modules/html.content.box";
import * as d3Array from 'd3-array'
const d3=Object.assign({},d3Array);

const title = new Title('Titre').text('Carte des parrainages des maires')
                                    .appendTo('article#main');

const menu = new HtmlMenuSelect('choixDepartement', { label: 'Département: ', placeHolder:'Sélectionnez dans la liste' })
                                    .appendTo('article#main');

const   dataDepartements =  new DataCollection('departements').primaryKey('id')
                                .load('../assets/data/departements.csv', { mapper: row => row }),
        dataCandidats =     new DataCollection('candidats')
                                .load('../assets/data/candidats-reference.csv' ),
        dataPrefectures =   new DataCollection('prefectures')
                                .load('../assets/data/prefectures.csv',{ mapper: row => row } );

const   mapCommunes = { },
        mapContainer =      new SvgMapComposition('maCarte')
                                .appendTo('article#main'),
        mapDepartements =   new SvgMapLayer('departements', { autofit:true, primary:'DEP', zoomable:false })
                                .appendTo(mapContainer)
                                .load('../assets/topojson/departements.topojson')
                                .render()
                                .dispatch.on('click',(v)=> zoomToDept(v.id));

const box = new HtmlContentBox('ContentBox').appendTo('article#main');



const colorFn =  ( d , context) => {
    const values=d.properties.values;
    if (!values) {
        return null;
    }
    if (values && values.length===1) {
        const candidat = dataCandidats.find('candidat',values[0]['Candidat']);
        return (candidat) ? candidat.couleur : 'none';
    }
    else if (values.length>1) {
        values.forEach( v=> {
            const candidat = dataCandidats.find('candidat', v.Candidat);
            v.color = candidat.couleur || null;
        });
        const colors = d3.rollups( values, v=>v.length, d=>d.color )
                .sort( (a,b) => d3.descending(a[1], b[1])),
            sum = d3.sum(colors,v=>v[1]);
        let index=0;
        colors.forEach( v => {
            index+=v[1];
            v[1]=Math.floor(1000*index/sum)/1000;
        });
        return context.addGradient(colors, { id: `gr${d.properties.COM}`, orientation:45 });
    }

}


const zoomToDept= (depInsee) => {
    box.hide();
    mapContainer.fadeOutLayers(`.communes:not(#D${depInsee}`);
    if (!mapCommunes[`D${depInsee}`]) {
        const dataCommunes = new DataCollection(`P${depInsee}`).load(`../assets/data/P${depInsee}.csv`, {mapper: (d)=> d});
        mapContainer.zoomable(false);
        mapCommunes[`D${depInsee}`] = new SvgMapLayer(`D${depInsee}`,{ primary:'COM', secondary:'NCC', className:'communes' })
            .appendTo(mapContainer)
            .load(`../assets/topojson/${depInsee}.topojson`)
            .render()
            .zoom()
            .merge(dataCommunes,'insee')
            .fill(colorFn)
            .labels(dataPrefectures,'COM','NCCENR');
    }
    else {
        mapCommunes[`D${depInsee}`].fadeIn().zoom();
    }
    mapCommunes[`D${depInsee}`].dispatch.on('click',(param)=>{
        box.reset()
            .title(param.values.NCCENR)
            .table(param.values.values, (d)=> `<td>${d.Prénom} ${d.Nom}</td><td>${d.Mandat}</td><td>${d.Candidat}</td>`)
            .position(param.event)
            .show();
    })
}


mapDepartements











Promise.all([dataDepartements.ready, dataCandidats.ready, dataCandidats.ready]).then( ()=>  {

    menu.data( dataDepartements.toGroups('reg_nom'), { nested:true, nameKey:'departement', valueKey: 'id' } )
        .dispatch.on('change', zoomToDept);



});



