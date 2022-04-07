import '../style/main.scss'
import '../style/custom.scss'
import '../style/dev.scss'

import {DataCollection} from "./modules/data/datacollection";
import {Title} from "./modules/html/content.text";
import {NavBreadcrumb} from "./modules/html/nav.breadcrumb";
import {NavButtons} from "./modules/html/nav.buttons";
import {ContentBox} from "./modules/html/content.box";
import {Panel} from "./modules/html/panel.js";
import {MapComposition} from './modules/svg/map.composition';
import {MapLayer} from './modules/svg/map.layer';

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
        row[key] = (['dep','insee','nom'].includes(key)) ? row[key] : parseFloat(row[key]);
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
        if (key.substring(0, 2)==='nb' || key==='tncc' || key==='reg_insee') row[key]=parseInt(row[key]);
        else if (key.substring(0, 4)==='voix' || key==='participation') row[key]=parseFloat(row[key]);
    }
    return row;
}

/**
 * Mapper pour le fichier candidats
 * @param row
 * @returns {*}
 */
const dataMapperCand = (row) => {
    for (const [key, value] of Object.entries(row)) {
        row[key] = (['id', 'dep_min', 'dep_max', 'dep_moy','dep_med', 'com_min', 'com_max', 'com_moy','com_med','fr_moy'].includes(key)) ? parseFloat(row[key]) : row[key];
    }
    return row;
}


/**
 * Zoome sur un departement
 * @param insee
 */
const zoomToDept= (insee) => {
    appBox.hide();
    appPanel.fold();
    //Zoom-in: zoom sur un département
    if (insee){
        mapContainer.fadeOutLayers(`.communes:not(._${insee}`);
        const candidat = dataCandidats.find(global.candidat);
      //  console.log(appNavigator.level(1));
        //Cas A : Carte et données à charger
        if (!mapCommunes[`_${insee}`]) {

            const dataCommunes = new DataCollection(`Résultats_${insee}`)
                                        .load(`../assets/data/${insee}.csv`,
                                            {   primary:'insee',
                                                mapper: dataMapperCom });
            dataCommunes.ready.then((v)=>{
                mapCommunes[`_${insee}`] = new MapLayer(`_${insee}`,{ primary:'COM', secondary:'NCC', className:'communes' })
                    .appendTo(mapContainer)
                    .load(`../assets/geomap/${insee}.topojson`);
                mapCommunes[`_${insee}`].exportProperties();

                mapCommunes[`_${insee}`].render()
                    .join(dataCommunes,'insee')
                    .fill ( colorFactory2( candidat.couleur,dataCommunes.col(candidat.key)),  d =>  d.properties.extra[candidat.key])
                    // .fill ( colorFactory( candidat.couleur,[candidat.com_min,candidat.com_max]),  d =>  d.properties.extra[candidat.key])
                    .labels(dataPrefectures,'COM','NCCENR');
                mapCommunes[`_${insee}`].dispatch.on('click',appBox.push );
            })
//AJOUTER PROMESSE dataCommunes.ready


           // mapContainer.zoomable(true);
         }
        //Cas B : carte et données déjà chargés
        else {
            mapCommunes[`_${insee}`].fadeIn();
          //  mapCommunes[`_${insee}`].dispatch.on('click',appBox.push );
            //mapDepartements.zoomOn(insee);
        }

        mapDepartements.zoomOn(insee);


            /*
            appBox.reset()
                .title(param.values.NCCENR)
                .content(param.values)
               // .table(param.values.values, (d)=> `<td>${d.Prénom} ${d.Nom}</td><td>${d.Mandat}</td><td>${d.Candidat}</td>`)
                .position(param.event)
                .show();*/

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
const colorFactory = (baseColor, domain=[0,100] )=> {
    return d3.scaleLinear()
        .range([baseColor,'#eee'])
        .domain(domain)
        .interpolate(d3.interpolateLab);
}


const colorFactory2 = (baseColor, data )=> {
   // console.log(data,Math.min(...data),Math.max(...data));
    return d3.scaleLinear()
        .range([baseColor,'#eee'])
        .domain([d3.min(data),d3.max(data)])
        .interpolate(d3.interpolateLab);
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


const   appTitle =          new Title('Titre',['titre','candidat']);
const   appNavigator =      new NavBreadcrumb('Navigator');
const   appPanel =          new Panel('candPanel');
const   appSelector =   new NavButtons('boutonsCandidats',{label:'', style:'square'});



const appBox =  new ContentBox('ContentBox');
appBox.push=function(param){
    //console.log(this,param);
    this.reset()
        .title(param.values.NCCENR)
        // .table(param.values.values, (d)=> `<td>${d.Prénom} ${d.Nom}</td><td>${d.Mandat}</td><td>${d.Candidat}</td>`)
        .position(param.event)
        .show();
}.bind(appBox)

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
               // console.warn(candidat);
                mapDepartements
                    .fill ( colorFactory2( candidat.couleur,dataDepartements.col(candidat.key)), d =>  d.properties.extra[candidat.key]);
                  //  .fill ( colorFactory( candidat.couleur,[candidat.dep_min,candidat.dep_max]), d =>  d.properties.extra[candidat.key]);
                for (const[key,myMap] of Object.entries(mapCommunes)) {
                    myMap.fill ( colorFactory( candidat.couleur,[candidat.dep_min,candidat.dep_max]), d =>  d.properties.extra[candidat.key]);
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
    .load('./../assets/data/candidats-test.csv',{ primary: 'id',  delimiter: ';', mapper: dataMapperCand });

const dataDepartements = new DataCollection('resParDept')
    .load('./../assets/data/departements-test.csv',{ primary: 'insee', delimiter: ';', mapper: dataMapperDep });

const dataPrefectures = new DataCollection('prefectures')
    .load('./../assets/geodata/prefectures.csv',{   primary:'COM', mapper: row => row });


/**************************************** CARTES ***************************************/

const   mapCommunes = { },
        mapContainer =      new MapComposition('maCarte')
                                .appendTo('mainMap'),
        mapDepartements =   new MapLayer('departements', { autofit:true, primary:'DEP' })
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

Promise.all([ dataDepartements.ready, dataCandidats.ready]).then( ()=>  {

    appTitle.appendTo('mainHeader');
    appBox.appendTo('mainMap');

    appNavigator.level(0,'France');
    appNavigator.level(1,dataDepartements, { placeHolder: 'Département', nestKey: 'reg_nom', valueKey:'insee', labelKey:'nom'});
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
        .join (dataDepartements,'insee')
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



