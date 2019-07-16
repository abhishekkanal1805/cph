// import * as _ from "lodash";
// function test(resource: any, language: string) {
//   const translate = resource.translation || {};
//   // If translation attribute not present then return original object
//   if (_.isEmpty(translate)) {
//     return resource;
//   }
//   // If No translation present for requested attribute, return base language
//   Object.assign(resource, translate[language] || {});
//   delete resource.translation;
//   return resource;
// }

// const input = {
//   translation: {
//     nl: {
//       subtitle: "Testtitel-nl",
//       title: "Testtitel-nl",
//       status: "statuzes-nl"
//     },
//     de: {
//       subtitle: "Testtitel-de",
//       title: "Testtitel-de"
//     },
//     zh: {
//       status: "Tsing tsao-zh",
//       address: {
//         line1: "121 Marvel Blvd",
//         line2: "Ste 5",
//         city: "",
//         zip: "",
//         state: "",
//         contact: {
//           name: "",
//           telecom: [{}]
//         }
//       }
//     }
//   },
//   subtitle: "Testtitel",
//   title: "Testtitel",
//   status: "statuzes"
// };
// const res = test(input, "zh");
// console.log(JSON.stringify(res));
