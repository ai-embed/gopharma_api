import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AssistantMessageDocument = HydratedDocument<AssistantMessage>;

@Schema({ timestamps: true, collection: 'assistant_messages' })
export class AssistantMessage {
  @Prop({ type: Types.ObjectId, required: true, ref: 'AssistantConversation' })
  conversationId!: Types.ObjectId;

  @Prop({ required: true, enum: ['USER', 'ASSISTANT'] })
  role!: 'USER' | 'ASSISTANT';

  @Prop({ required: true })
  content!: string;

  @Prop({ type: [String], default: [] })
  citations!: string[];
}

export const AssistantMessageSchema = SchemaFactory.createForClass(AssistantMessage);
AssistantMessageSchema.index({ conversationId: 1, createdAt: 1 });
