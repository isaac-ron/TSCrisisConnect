// Convert CrisisTransformers model to ONNX format for @xenova/transformers
import { AutoTokenizer, AutoModelForSequenceClassification } from '@xenova/transformers';
import path from 'path';

const MODEL_PATH = path.resolve('..', 'nlp-service', 'CrisisTransformers', 'CT-M1-Complete');
const OUTPUT_PATH = path.join(MODEL_PATH, 'onnx');

async function convertModel() {
  try {
    console.log('Converting CrisisTransformers model to ONNX...');
    
    // This will download the model and convert it
    const model = await AutoModelForSequenceClassification.from_pretrained('CrisisTransformers/CT-M1-Complete', {
      save_pretrained: OUTPUT_PATH,
      from_tf: false,
    });
    
    console.log('✅ Model converted successfully to:', OUTPUT_PATH);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.log('\n💡 Alternative: Use the HuggingFace API token in your .env file');
  }
}

convertModel();