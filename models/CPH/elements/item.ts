import { DynamoDbSchema } from "@aws/dynamodb-data-mapper";
import { Schema, SchemaType } from "@aws/dynamodb-data-marshaller";
import { Attachment } from "../../common/attachment";
import { Coding } from "../../common/coding";
import { Quantity } from "../../common/quantity";
import { Reference } from "./reference";

class Item {
  linkId?: string;
  prefix?: string;
  text?: string;
  answer?: Answer[];
  item?: Item[];
}

class Answer {
  valueBoolean?: boolean;
  valueDecimal?: number;
  valueInteger?: number;
  valueDate?: string;
  valueDateTime?: string;
  valueTime?: string;
  valueString?: string;
  valueUri?: string;
  valueAttachment?: Attachment;
  valueCoding?: Coding;
  valueQuantity?: Quantity;
  valueReference?: Reference;
  item?: Item[];
}

const itemSchema: Schema = {
  linkId: { type: "String" },
  prefix: { type: "String" },
  text: { type: "String" }
};
const itemList: SchemaType = {
  type: "List",
  memberType: {
    type: "Document",
    valueConstructor: Item,
    members: itemSchema
  }
};
itemSchema.item = itemList;

const answerSchema: Schema = {
  valueBoolean: { type: "Boolean" },
  valueDecimal: { type: "Number" },
  valueInteger: { type: "Number" },
  valueDate: { type: "String" },
  valueDateTime: { type: "String" },
  valueTime: { type: "String" },
  valueString: { type: "String" },
  valueUri: { type: "String" },
  valueAttachment: { type: "Any" },
  valueCoding: { type: "Any" },
  valueQuantity: { type: "Any" },
  valueReference: { type: "Any" },
  item: itemList
};

itemSchema.answer = {
  type: "List",
  memberType: {
    type: "Document",
    valueConstructor: Answer,
    members: answerSchema
  }
};

Object.defineProperties(Item.prototype, {
  [DynamoDbSchema]: { value: itemSchema }
});
Object.defineProperties(Answer.prototype, {
  [DynamoDbSchema]: { value: answerSchema }
});

export { Item };
