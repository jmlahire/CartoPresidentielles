import '../style/main.scss'
import '../style/custom.scss'
import '../style/dev.scss'

import {DataCollection} from "./modules/data.datacollection";
import {Title} from "./modules/html.content.title";
import {HtmlNavigationBreadcrumb} from "./modules/html.navigation.breadcrumb";
import {HtmlMenuButtons} from "./modules/html.menu.buttons";
import {HtmlContentBox} from "./modules/html.content.box";
import {HtmlPanel} from "./modules/html.panel.js";
import {SvgMapComposition} from './modules/svg.map.composition';
import {SvgMapLayer} from './modules/svg.map.layer';

import * as d3Array from 'd3-array'
import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
const d3=Object.assign({},d3Array,d3Interpolate,d3Scale);






/************************************* FONCTIONS ****************************************/
/**
 * Mapper pour les fichiers de résultats par communes au format csv
 * @param row
 * @returns {*}
 */
const dataMapperCom = (row) => {
    for (const [key, value] of Object.entries(row)) {
        row[key] = (['dep','insee','com'].includes(key)) ? row[key] : parseFloat(row[key]);
    }
    return row;
}

/**
 * Mapper pour les fichiers de résultats par departements au format csv
 * @param row
 * @returns {*}
 */
const dataMapperDep = (row) => {
    for (const [key, value] of Object.entries(row)) {
        row[key] = (key==='id') ? row[key] : parseFloat(row[key]);
    }
    return row;
}





const zoomToDept= (insee) => {
    appBox.hide();
    appPanel.fold();
    //Zoom-in: zoom sur un département
    if (insee){
        mapContainer.fadeOutLayers(`.communes:not(._${insee}`);
        const candidat = dataCandidats.find(global.candidat);
        //Cas A : Carte et données à charger
        if (!mapCommunes[`_${insee}`]) {

            const dataCommunes = new DataCollection(`Résultats_${insee}`)
                                        .load(`../assets/data/${insee}.csv`,
                                            {   primary:'insee',
                                                mapper: dataMapperCom });

            mapCommunes[`_${insee}`] = new SvgMapLayer(`_${insee}`,{ primary:'COM', secondary:'NCC', className:'communes' })
                .appendTo(mapContainer)
                .load(`../assets/geomap/${insee}.topojson`)
                .render()
                .join(dataCommunes,'insee')
                .fill ( colorFactory( candidat.couleur,[15,35]),
                    d =>  d.properties.values[0][candidat.key])
                .labels(refPrefectures,'COM','NCCENR');

           // mapContainer.zoomable(true);
         }
        //Cas B : carte et données déjà chargés
        else {
            mapCommunes[`_${insee}`].fadeIn();
            //mapDepartements.zoomOn(insee);
        }

        mapDepartements.zoomOn(insee);
        mapCommunes[`_${insee}`].dispatch.on('click',(param)=>{
            appBox.reset()
                .title(param.values.NCCENR)
                .table(param.values.values, (d)=> `<td>${d.Prénom} ${d.Nom}</td><td>${d.Mandat}</td><td>${d.Candidat}</td>`)
                .position(param.event)
                .show();
        })
    }
    //Zoom-out: retour carte de France
    else {
        mapDepartements.deselectAll();
        mapContainer.fadeOutLayers(`.communes`);
        mapContainer.zoomOut();
    }

}


/**
 * Renvoie un interplateur données -> couleurs
 * @param baseColor
 * @param range
 * @returns {*}
 */
const colorFactory = (baseColor, range=[0,100] )=> {
    return d3.scaleLinear()
        .range([baseColor,'#eee'])
        .domain([15,40])
        .interpolate(d3.interpolateLab)
}

/**
 * Modifie le titre
 * @param {Object} candidat         Données du candidat
 */
const changeTitle = (candidat) => {
    let t,n;
    switch (candidat.id) {
        case 13:
            t = 'Cartographie de l\'';
            n = 'abstention';
            break;
        case 14:
            t = 'Cartographie du ';
            n = 'vote blanc';
            break;
        default:
            t = 'Cartographie du vote ';
            n = candidat.nom;
    }
    appTitle.text('titre',t)
        .text('candidat',n,[`color:${candidat.couleur}`,'font-weight:bold'])
        .render();
}





/************************************** COMPOSANTS *******************************************/


const   appTitle =          new Title('Titre',['titre','candidat']).appendTo('mainHeader'),
        appNavigator =      new HtmlNavigationBreadcrumb('Navigator'),
       // appDeptSelector =   new HtmlMenuSelect('choixDepartement', { label: 'Département: ', placeHolder:'Sélectionnez dans la liste' }).appendTo('mainHeader'),
        appPanel =          new HtmlPanel('candPanel'),
        appSelector =   new HtmlMenuButtons('boutonsCandidats',{label:'', style:'square'}),
        appBox =            new HtmlContentBox('ContentBox').appendTo('mainOuterContainer');



/************************************** DONNEES *******************************************/


const global = new Proxy( { candidat:1, departement:0 } , {
    get: (target, prop, receiver)=> {
        return target[prop];
    },
    set: (target, prop, value, receiver) => {
        //Modification candidat
        if (prop==='candidat') {
            const candidat = dataCandidats.find(value);
            if (candidat) {
                target.candidat=value;
                changeTitle(candidat);
                appPanel.fold({delay:500});
                mapDepartements
                    .fill ( colorFactory( candidat.couleur,[15,35]),
                        d =>  d.properties.values[0][candidat.key]);
                for (const[key,myMap] of Object.entries(mapCommunes)) {
                    //console.log(myMap);
                    myMap.fill ( colorFactory( candidat.couleur,[15,35]),
                        d =>  d.properties.values[0][candidat.key]);
                }
               // mapCommunes.forEach( m=> console.log(m));
                return true;
            }
        }
        //Changement département (0 = France entière)
        else if (prop==='departement'){
            zoomToDept(value);
        }
        return true;
    }
});


const dataCandidats = new DataCollection('candidats')
    .load('./../assets/data/candidats-stats.csv',
        {
            primary: 'id',
            mapper: row => {
                for (const [key, value] of Object.entries(row)) {
                    row[key] = (['id', 'min', 'max', 'moy'].includes(key)) ? parseFloat(row[key]) : row[key];
                }
                return row;
            }
        });

const refDepartements = new DataCollection('departements')
    .load('./../assets/data/departements.csv',
        {
            primary: 'id',
            mapper: row => row
        });

const dataDepartements = new DataCollection('resParDept')
    .load('./../assets/data/FD.csv',
        {
            primary: 'id',
            mapper: dataMapperDep
        });

const refPrefectures = new DataCollection('prefectures')
    .load('./../assets/geodata/prefectures.csv',
        {   primary:'COM',
                    mapper: row => row });


/**************************************** CARTES ***************************************/

const   mapCommunes = { },
        mapContainer =      new SvgMapComposition('maCarte')
                                .appendTo('mainMap'),
        mapDepartements =   new SvgMapLayer('departements', { autofit:true, primary:'DEP' })
                                .appendTo(mapContainer)
                                .load('./../assets/geomap/departements.topojson');

//Modifie l'opacité de la couche départements en fonction du niveau de zoom

const   zoomScaleDep = d3.scaleLinear().domain([1,7]).range([1,0.05]).clamp(true),
        zoomScaleCom = d3.scaleLinear().domain([1,6]).range([0,1]).clamp(true);

mapContainer.dispatch.on('zoom', zoom => {
    let opacityDep=zoomScaleDep(zoom.level),
        opacityCom=zoomScaleCom(zoom.level);
    mapDepartements.container.style('opacity',opacityDep);
    for (const [k, m] of Object.entries(mapCommunes)){
        m.container.style('opacity',opacityCom);
    }
});












/********************************** MAIN *****************************************/

Promise.all([refDepartements.ready, dataDepartements.ready, dataCandidats.ready]).then( ()=>  {



    appNavigator.level(0,'France');
    appNavigator.level(1,refDepartements, { placeHolder: 'Département', nestKey: 'reg_nom', valueKey:'id', labelKey:'departement'});
    appNavigator.appendTo('mainHeader');
    appNavigator.render();
    appNavigator.dispatch.on('change',(d)=> {
        if (d.index===0) global.departement=0;
        else if (d.index===1) zoomToDept(d.value);
    });





    appPanel.appendTo('mainMap');
    appSelector.data(dataCandidats, { img:'img',color:'couleur',value:'id',label:'nom'}, { path:'assets/img/', check:'check.svg'})
                    .appendTo(appPanel)
                    .render()
                    .select(1);
    appSelector.dispatch.on('select',d=> global.candidat=d.value);







  /*  appDeptSelector.container
        .append('a')
        .attr('href','#')
        .style('margin-left','3rem')
        .text('Retour à la carte de France')
        .on('click', ()=> global.departement=0);*/

    mapDepartements
        .render()
        .join (dataDepartements,'id')
        .dispatch.on('click',(v)=> zoomToDept(v.id));





    //new Title('titrePano',['text']).text('text','Candidats').render().appendTo(appCandSelector);



   /* appDeptSelector
        .data( refDepartements.toGroups('reg_nom'), { nested:true, nameKey:'departement', valueKey: 'id' } )
        .dispatch.on('change', zoomToDept);*/


    global.candidat=1;









/*

    setTimeout(()=>{
        let u=appNavigator.level(1);
        u.select('54');
     //   global.departement=0;
    },4000);*/


});



